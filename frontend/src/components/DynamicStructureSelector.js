import React, { useEffect, useState } from 'react';
import axios from 'axios';

const DynamicStructureSelector = ({ institution, taxonomyNodes, onChange }) => {
	const [institutions, setInstitutions] = useState([]);
	const [structure, setStructure] = useState([]);
	const [levels, setLevels] = useState([]);
	const [error, setError] = useState('');

	useEffect(() => {
		axios.get('/api/institutions')
			.then((response) => setInstitutions(response.data.data || []))
			.catch(() => setError('Impossible de charger les institutions.'));
	}, []);

	const loadLevel = async (institutionId, parentId, depth, nextNodes) => {
		const response = await axios.get(`/api/institutions/${institutionId}/structure`, {
			params: { parent: parentId || 'root', limit: 100 },
		});
		const institutionData = response.data.data?.institution;
		const children = response.data.data?.nodes || [];
		const nextLevels = [...nextNodes];
		nextLevels[depth] = children;
		setStructure(institutionData?.navigationStructure || []);
		setLevels(nextLevels.slice(0, depth + 1));
	};

	const handleInstitutionChange = async (event) => {
		const institutionId = event.target.value;
		setError('');
		if (!institutionId) {
			setStructure([]);
			setLevels([]);
			onChange({ institution: '', taxonomyNodes: [] });
			return;
		}
		try {
			await loadLevel(institutionId, null, 0, []);
			onChange({ institution: institutionId, taxonomyNodes: [] });
		} catch (requestError) {
			setError(requestError.response?.data?.message || 'Impossible de charger la structure.');
		}
	};

	const handleNodeChange = async (depth, nodeId) => {
		const nextNodes = [...taxonomyNodes.slice(0, depth), nodeId].filter(Boolean);
		onChange({ institution, taxonomyNodes: nextNodes });
		setError('');
		if (nodeId && depth < structure.length - 1) {
			try {
				await loadLevel(institution, nodeId, depth + 1, levels);
			} catch (requestError) {
				setError(requestError.response?.data?.message || 'Impossible de charger le niveau suivant.');
			}
		} else {
			setLevels(levels.slice(0, depth + 1));
		}
	};

	return (
		<div className="sm:col-span-2 space-y-3">
			<label className="text-xs font-bold uppercase tracking-wide text-slate-500">Structure dynamique</label>
			<select value={institution} onChange={handleInstitutionChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold">
				<option value="">Institution (optionnelle)</option>
				{institutions.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
			</select>
			{structure.map((type, depth) => (
				<select key={`${type}-${depth}`} value={taxonomyNodes[depth] || ''} onChange={(event) => handleNodeChange(depth, event.target.value)} disabled={!levels[depth]} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold">
					<option value="">{type}</option>
					{(levels[depth] || []).map((node) => <option key={node._id} value={node._id}>{node.name}</option>)}
				</select>
			))}
			{error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
		</div>
	);
};

export default DynamicStructureSelector;
