import React, { useState, useEffect } from 'react';
import Wallet from 'casper-wallet-connector';
import './App.css';

const App = () => {
	const network = 'testnet';
	const [providerUrl, setProviderUrl] = useState('https://testnet.casperdash.io/connector');
	const [selectedWallet, setSelectedWallet] = useState(null);
	const [logs, setLogs] = useState([]);
	const addLog = (message) => {
		setLogs(logs.concat(message));
	};

	useEffect(() => {
		if (selectedWallet) {
			return () => {
				selectedWallet.disconnect();
			};
		}
	}, [selectedWallet]);

	const onConnectWallet = () => {
		const urlWallet = new Wallet(providerUrl, network);

		if (!urlWallet.connected) {
			urlWallet.connect();
		}
		urlWallet.on('connect', () => {
			addLog(`Connected to wallet ${urlWallet.publicKeyHex || '--'}`);
		});
		urlWallet.on('disconnect', () => {
			addLog('Disconnected from wallet');
		});
		setSelectedWallet(urlWallet);
	};

	const signDeploy = () => {};

	return (
		<div className="App">
			<h1>Wallet connector</h1>
			<h3>Network : {network}</h3>
			<div>
				Wallet Provider:{' '}
				<input
					style={{ width: 400 }}
					type="text"
					value={providerUrl}
					onChange={(e) => setProviderUrl(e.target.value)}
				></input>
			</div>
			<div>
				{(!selectedWallet || !selectedWallet.connected) && (
					<button onClick={onConnectWallet}>Connect to Wallet</button>
				)}
				{selectedWallet && selectedWallet.connected && (
					<>
						<button onClick={signDeploy}>Sign Deploy</button>
						<button onClick={() => selectedWallet.disconnect()}>Disconnect</button>
					</>
				)}
				{logs.map((l, i) => (
					<div key={i}>{l}</div>
				))}
			</div>
		</div>
	);
};

export default App;
