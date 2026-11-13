import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { ExerciseInput } from './Exercises';
import { LessonBlock } from './LessonBlocks';

jest.mock('axios');
// react-router 7 n'est pas résolu par le Jest de CRA : un lien simple suffit à ces composants.
jest.mock('react-router-dom', () => ({ Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });

const qcm = { code: 'E1', type: 'qcm', niveau: 1, consigne: 'Combien ?', contenu: { multiple: false, options: [{ id: 'o1', texte: '6' }, { id: 'o2', texte: '9' }] } };

describe('saisie des exercices (web)', () => {
  test('QCM : boutons radio accessibles, aucune bonne réponse révélée avant la correction serveur', () => {
    const onChange = jest.fn();
    const { rerender } = render(<ExerciseInput exercice={qcm} value={null} onChange={onChange} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(radios.every((r) => r.getAttribute('aria-checked') === 'false')).toBe(true);
    fireEvent.click(radios[1]);
    expect(onChange).toHaveBeenCalledWith({ ids: ['o2'] });
    // Réponse choisie, pas encore corrigée : aucun état « bon » ou « faux ».
    rerender(<ExerciseInput exercice={qcm} value={{ ids: ['o2'] }} onChange={onChange} />);
    expect(document.querySelector('.border-emerald-600')).toBeNull();
    // Correction renvoyée par le serveur : la bonne réponse et l'erreur apparaissent.
    rerender(<ExerciseInput exercice={qcm} value={{ ids: ['o2'] }} onChange={onChange} disabled correction={{ cle: { ids: ['o1'] } }} />);
    expect(screen.getByRole('radio', { name: /6/ }).className).toMatch(/emerald/);
    expect(screen.getByRole('radio', { name: /9/ }).className).toMatch(/burgundy/);
  });

  test('tous les types d’exercice ont des contrôles natifs utilisables au clavier', () => {
    const cases = [
      { type: 'vraiFaux', contenu: { affirmations: [{ id: 'a1', texte: 'A' }] }, role: 'radio' },
      { type: 'glisser', contenu: { segments: ['x ', { trou: 't1' }], etiquettes: [{ id: 'e1', texte: 'un' }] }, role: 'combobox' },
      { type: 'relier', contenu: { gauche: [{ id: 'g1', texte: 'G' }], droite: [{ id: 'd1', texte: 'D' }] }, role: 'combobox' },
      { type: 'classer', contenu: { cartes: [{ id: 'c1', texte: 'C' }], categories: [{ id: 'k1', nom: 'K' }] }, role: 'combobox' },
      { type: 'ordre', contenu: { elements: [{ id: 'r1', texte: 'Un' }, { id: 'r2', texte: 'Deux' }] }, role: 'button' },
      { type: 'numerique', contenu: {}, role: 'textbox' },
      { type: 'entourer', contenu: { elements: [{ id: 'x1', texte: 'X' }] }, role: 'checkbox' },
      { type: 'surligner', contenu: { segments: [{ id: 's1', texte: 'S' }] }, role: 'button' },
    ];
    cases.forEach(({ type, contenu, role }) => {
      const { unmount } = render(<ExerciseInput exercice={{ code: type, type, consigne: '', contenu }} value={null} onChange={() => {}} seed="t" />);
      expect(screen.getAllByRole(role).length).toBeGreaterThan(0);
      unmount();
    });
  });

  test('numérique : la valeur attendue n’apparaît qu’avec la correction', () => {
    const ex = { code: 'N', type: 'numerique', consigne: '', contenu: { unite: 'FCFA' } };
    const { rerender } = render(<ExerciseInput exercice={ex} value={{ valeur: '4' }} onChange={() => {}} />);
    expect(screen.queryByText(/Valeur attendue/)).toBeNull();
    rerender(<ExerciseInput exercice={ex} value={{ valeur: '4' }} onChange={() => {}} correction={{ cle: { valeur: 500000 } }} />);
    expect(screen.getByText('Valeur attendue : 500000 FCFA')).toBeInTheDocument();
  });
});

describe('blocs de leçon', () => {
  test('gras, tableau et liste rendus sans HTML injecté', () => {
    render(
      <>
        <LessonBlock bloc={{ type: 'texte', md: 'Une **puissance** <script>x</script>' }} index={0} />
        <LessonBlock bloc={{ type: 'tableau', entetes: ['A', 'B'], lignes: [['1', '2']] }} index={1} />
        <LessonBlock bloc={{ type: 'liste', ordonnee: true, items: ['un', 'deux'] }} index={2} />
      </>,
    );
    expect(screen.getByText('puissance').tagName).toBe('STRONG');
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});

describe('file d’actions (web)', () => {
  let client;
  beforeEach(() => {
    jest.resetModules();
    window.localStorage.clear();
    window.localStorage.setItem('fatafalta.prep.token', 'p1.jeton');
    // eslint-disable-next-line global-require
    client = require('./client');
  });

  test('acquittement par action : erreur temporaire gardée, refus et succès retirés ; jeton en en-tête', async () => {
    const ax = require('axios'); // eslint-disable-line global-require
    ax.post.mockImplementation(async (url, body, config) => {
      expect(config.headers['X-Prep-Token']).toBe('p1.jeton');
      expect(url).toBe('/api/prep/sync');
      return { data: { data: { resultats: body.actions.map((a, i) => ({ cle: a.cle, ok: i !== 1, statut: ['applied', 'retry', 'rejected'][i] })) } } };
    });
    ['a', 'b', 'c'].forEach((cle) => client.enqueue({ cle, type: 'minutes', programme: 'P', minutes: 1 }));
    await client.flush();
    expect(client.queueState().pending).toBe(1);
    expect(JSON.parse(window.localStorage.getItem('fatafalta.prep.file')).map((a) => a.cle)).toEqual(['b']);
  });

  test('panne réseau : rien n’est perdu, la file survit au rechargement de la page', async () => {
    const ax = require('axios'); // eslint-disable-line global-require
    ax.post.mockRejectedValue(new Error('Network Error'));
    client.enqueue({ cle: 'x', type: 'tentative', programme: 'P', exercice: 'E1', reponse: { ids: ['o1'] } });
    expect(await client.flush()).toBeNull();
    jest.resetModules();
    const reloaded = require('./client'); // eslint-disable-line global-require
    expect(reloaded.queueState().pending).toBe(1);
  });

  test('reprise : une seule reprise non envoyée par programme, jamais dans l’adresse', () => {
    client.shareResume('P', { type: 'lecon', lecon: 'L1', position: 0.2 });
    client.shareResume('P', { type: 'lecon', lecon: 'L1', position: 0.7 });
    const file = JSON.parse(window.localStorage.getItem('fatafalta.prep.file'));
    expect(file).toHaveLength(1);
    expect(file[0].cible.position).toBe(0.7);
    expect(file[0].seq).toBe(2);
    expect(file[0].appareil).toMatch(/^web-/);
  });
});

test('axios est simulé : aucun appel réseau réel pendant ces tests', () => {
  expect(jest.isMockFunction(axios.get)).toBe(true);
});
