import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuthContext from '../../context/AuthContext';
import AppAccountCheck from './AppAccountCheck';

let mockSearch = '';
jest.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(mockSearch)],
  useLocation: () => ({ pathname: '/compte/abonnement', search: `?${mockSearch}` }),
  useNavigate: () => jest.fn(),
  Link: ({ children }) => children,
}), { virtual: true });

const renderWith = (user, query) => {
  mockSearch = query;
  return render(<AuthContext.Provider value={{ user, logout: jest.fn() }}><AppAccountCheck /></AuthContext.Provider>);
};

test('autre compte connecté sur le site : avertissement avant paiement', () => {
  renderWith({ email: 'b@x.ci', accountHint: 'BBBBBBBBBBBBBBBB' }, 'source=app&compte=AAAAAAAAAAAAAAAA');
  expect(screen.getByRole('alert')).toHaveTextContent('Ce n’est pas le compte de ton application');
  expect(screen.getByRole('button', { name: 'Changer de compte' })).toBeInTheDocument();
});

test('même compte : rien à signaler, même avec un lien expiré', () => {
  const { container } = renderWith({ email: 'a@x.ci', accountHint: 'AAAAAAAAAAAAAAAA' }, 'source=app&compte=AAAAAAAAAAAAAAAA&lien=expire');
  expect(container).toBeEmptyDOMElement();
});

test('lien expiré sans empreinte vérifiable : rappel d’utiliser le même compte', () => {
  renderWith({ email: 'a@x.ci' }, 'source=app&lien=expire');
  expect(screen.getByRole('status')).toHaveTextContent('Le lien depuis l’application a expiré');
});

test('hors application : aucun message', () => {
  const { container } = renderWith({ email: 'a@x.ci', accountHint: 'X' }, 'compte=Y');
  expect(container).toBeEmptyDOMElement();
});
