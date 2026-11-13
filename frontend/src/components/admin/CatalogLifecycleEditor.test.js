import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import CatalogLifecycleEditor from './CatalogLifecycleEditor';
jest.mock('axios');
beforeEach(() => { jest.clearAllMocks(); axios.get.mockResolvedValue({ data: { data: [{ _id: 'node', nom: 'Niveau', status: 'published' }], meta: { pagination: { pages: 2 } } } }); });
test('modifie la visibilité et présente le refus de dépendances', async () => {
  axios.patch.mockRejectedValue({ response: { data: { error: 'Retire les descendants publiés.' } } });
  render(<CatalogLifecycleEditor organismeId="org" />);
  fireEvent.change(await screen.findByLabelText('Statut node'), { target: { value: 'archived' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Retire les descendants publiés.');
  expect(axios.patch).toHaveBeenCalledWith('/api/noeuds/node', { nom: 'Niveau', status: 'archived' });
});
test('navigation des descendants et pagination gardent la portée administrative', async () => {
  render(<CatalogLifecycleEditor organismeId="org" />);
  const open = await screen.findByRole('button', { name: 'Ouvrir les descendants' });
  await act(async () => { fireEvent.click(open); });
  await waitFor(() => expect(axios.get).toHaveBeenLastCalledWith('/api/noeuds', { params: { organismeId: 'org', parentId: 'node', scope: 'admin', page: 1, limit: 20 } }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Suivant' })); });
  await waitFor(() => expect(axios.get).toHaveBeenLastCalledWith('/api/noeuds', { params: expect.objectContaining({ page: 2, parentId: 'node' }) }));
});
