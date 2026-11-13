import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminPrepContent from './AdminPrepContent';
import { prepAdmin } from '../../lib/api';
jest.mock('../../lib/api', () => ({ prepAdmin: { list: jest.fn(), get: jest.fn(), save: jest.fn(), create: jest.fn(), validate: jest.fn(), publish: jest.fn(), archive: jest.fn(), remove: jest.fn() }, errorMessage: e => e.response?.data?.error || e.message }));
const row = { kind: 'module', code: 'MATH', revision: 2, status: 'draft', dependencies: ['P1', 'P2'], payload: { code: 'MATH', titre: 'Calcul', lecons: [], exercices: [] } };
beforeEach(() => {
  jest.clearAllMocks();
  prepAdmin.list.mockResolvedValue({ data: [row], generation: 7, history: [{ generation: 6 }, { generation: 7 }], pagination: { pages: 2 } });
  prepAdmin.get.mockResolvedValue(row); prepAdmin.save.mockResolvedValue({ ...row, revision: 3 });
});
test('édition, avertissement module partagé et publication avec génération attendue', async () => {
  render(<AdminPrepContent />); fireEvent.click(await screen.findByRole('button', { name: 'MATH' }));
  expect(await screen.findByRole('note')).toHaveTextContent('P1, P2');
  fireEvent.change(screen.getByLabelText('Contenu JSON'), { target: { value: JSON.stringify({ ...row.payload, titre: 'Nouveau calcul' }) } });
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
  await waitFor(() => expect(prepAdmin.save).toHaveBeenCalledWith('module', 'MATH', expect.objectContaining({ titre: 'Nouveau calcul' }), 2));
  await screen.findByText('Brouillon enregistré et ajouté à la publication groupée.');
  fireEvent.click(screen.getByRole('button', { name: 'Publier les révisions sélectionnées' }));
  await waitFor(() => expect(prepAdmin.publish).toHaveBeenCalledWith({ expectedGeneration: 7, revisions: [{ kind: 'module', code: 'MATH', revision: 3 }] }));
  await screen.findByText('Publication disponible immédiatement.');
});
test('validation 422 et conflit 409 restent visibles sans perdre le texte saisi', async () => {
  prepAdmin.validate.mockRejectedValue({ response: { data: { error: 'Contenu invalide', details: ['Traduction manquante'] } } });
  prepAdmin.save.mockRejectedValue({ response: { status: 409, data: { error: 'Le contenu a changé' } } });
  render(<AdminPrepContent />); fireEvent.click(await screen.findByRole('button', { name: 'MATH' }));
  await screen.findByLabelText('Contenu JSON');
  fireEvent.click(screen.getByRole('button', { name: 'Valider la révision enregistrée' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Traduction manquante');
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Le contenu a changé'));
  expect(screen.getByLabelText('Contenu JSON')).toHaveValue(JSON.stringify(row.payload, null, 2));
});
test('pagination et restauration explicite', async () => {
  render(<AdminPrepContent />); await screen.findByRole('button', { name: 'MATH' });
  fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
  await waitFor(() => expect(prepAdmin.list).toHaveBeenLastCalledWith({ page: 2, limit: 20 }));
  fireEvent.change(screen.getByLabelText('Publication à restaurer'), { target: { value: '6' } });
  fireEvent.click(screen.getByRole('button', { name: 'Restaurer cette publication' }));
  await waitFor(() => expect(prepAdmin.publish).toHaveBeenCalledWith({ expectedGeneration: 7, rollbackGeneration: 6 }));
  await screen.findByText('Ancienne publication restaurée dans une nouvelle génération.');
});
test('JSON invalide ne part pas au serveur', async () => {
  render(<AdminPrepContent />); await screen.findByRole('button', { name: 'MATH' });
  fireEvent.click(screen.getByRole('button', { name: 'Nouveau contenu' }));
  fireEvent.change(screen.getByLabelText('Contenu JSON'), { target: { value: '{' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
  await screen.findByRole('alert'); expect(prepAdmin.create).not.toHaveBeenCalled();
});
test('un JSON incomplet reste éditable sans faire échouer l’aperçu', async () => {
  render(<AdminPrepContent />); await screen.findByRole('button', { name: 'MATH' });
  fireEvent.click(screen.getByRole('button', { name: 'Nouveau contenu' }));
  const value = JSON.stringify({ titre: { fr: 'Titre' }, lecons: {}, matieres: [{}], exercices: null });
  fireEvent.change(screen.getByLabelText('Contenu JSON'), { target: { value } });
  expect(screen.getByLabelText('Contenu JSON')).toHaveValue(value);
  expect(screen.getByRole('article', { name: 'Aperçu du contenu' })).toBeInTheDocument();
});
