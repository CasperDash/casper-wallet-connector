import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Wallet from 'casper-wallet-connector';
import './App.css';

const App = () => {
	const network = 'testnet';
	const [providerUrl, setProviderUrl] = useState('https://casperdash.io');
	const [selectedWallet, setSelectedWallet] = useState(null);
	const [connected, setConnected] = useState(false);
	const [logs, setLog] = useState([]);
	const addLog = useCallback(
		(message) => {
			setLog([...logs, message]);
		},
		[logs],
	);
	useEffect(() => {
		if (selectedWallet) {
			selectedWallet.on('connect', () => {
				setConnected(true);
				addLog(`Connected to wallet ${selectedWallet.publicKey ?? '--'}`);
			});
			selectedWallet.on('disconnect', () => {
				setConnected(false);
				addLog('Disconnected from wallet');
			});
			selectedWallet.connect();
			return () => {
				selectedWallet.disconnect();
			};
		}
	}, [selectedWallet, addLog]);

	const urlWallet = useMemo(() => new Wallet(providerUrl, network), [providerUrl, network]);

	return (
		<div className="App">
			<h1>Wallet connector</h1>
			<h3>Network : {network}</h3>
			<div>
				Wallet Provider:{' '}
				<input type="text" value={providerUrl} onChange={(e) => setProviderUrl(e.target.value)}></input>
			</div>
			<div>
				<button onClick={() => setSelectedWallet(urlWallet)}>Connect to Wallet</button>
				{logs.map((l, i) => (
					<div key={i}>{l}</div>
				))}
			</div>
		</div>
	);
};

export default App;
