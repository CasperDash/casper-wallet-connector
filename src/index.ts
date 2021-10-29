import EventEmitter from 'eventemitter3';
import { InjectedProvider, isInjectedProvider } from './InjectedProvider';

export default class Wallet extends EventEmitter {
	private _providerUrl: URL | undefined;
	private _injectedProvider?: InjectedProvider;
	private _publicKeyHex: string | null = null;
	private _popup: Window | null = null;
	private _handlerAdded = false;
	private _nextRequestId = 1;
	private _response: Map<number, [(value: string) => void, (reason: Error) => void]> = new Map();

	constructor(provider: unknown, private _network: string) {
		super();
		if (isInjectedProvider(provider)) {
			this._injectedProvider = provider;
		} else if (typeof provider === 'string') {
			this._providerUrl = new URL(provider);
			this._providerUrl.hash = new URLSearchParams({
				origin: window.location.origin,
				network: this._network,
			}).toString();
		} else {
			throw new Error('Provider parameter must be a injected provider or a URL string.');
		}
	}

	get publicKeyHex(): string | null {
		return this._publicKeyHex;
	}

	get connected(): boolean {
		return this._publicKeyHex !== null;
	}

	private async sendRequest(method: string, params: Record<string, unknown>) {
		if (method !== 'connect' && !this.connected) {
			throw new Error('Wallet not connected');
		}
		const requestId = this._nextRequestId;
		++this._nextRequestId;
		return new Promise((resolve, reject) => {
			this._response.set(requestId, [resolve, reject]);
			if (this._injectedProvider) {
				this._injectedProvider.postMessage({
					jsonrpc: '2.0',
					id: requestId,
					method,
					params: {
						network: this._network,
						...params,
					},
				});
			} else {
				this._popup?.postMessage(
					{
						jsonrpc: '2.0',
						id: requestId,
						method,
						params,
					},
					this._providerUrl?.origin ?? '',
				);
			}
		});
	}

	async disconnect(): Promise<void> {
		if (this._injectedProvider) {
			await this.sendRequest('disconnect', {});
		}
		if (this._popup) {
			this._popup.close();
		}
		this.handleDisconnect();
	}

	private handleConnect = () => {
		if (!this._handlerAdded) {
			this._handlerAdded = true;
			window.addEventListener('message', this.handleMessage);
			window.addEventListener('beforeunload', this.beforeUnload);
		}
		if (this._injectedProvider) {
			return new Promise<void>((resolve) => {
				void this.sendRequest('connect', {});
				resolve();
			});
		} else {
			window.name = 'parent';
			this._popup = window.open(
				this._providerUrl?.toString(),
				'_blank',
				'location,resizable,width=460,height=675',
			);
			return new Promise((resolve) => {
				this.once('connect', resolve);
			});
		}
	};

	async connect(): Promise<void> {
		if (this._popup) {
			this._popup.close();
		}
		await this.handleConnect();
	}

	private beforeUnload = (): void => {
		void this.disconnect();
	};

	private handleDisconnect = () => {
		if (this._handlerAdded) {
			this._handlerAdded = false;
			window.removeEventListener('message', this.handleMessage);
			window.removeEventListener('beforeunload', this.beforeUnload);
		}
		if (this.publicKeyHex) {
			this._publicKeyHex = null;
			this.emit('disconnect');
		}

		this._response.forEach(([, reject], id) => {
			this._response.delete(id);
			reject(new Error('Wallet disconnected'));
		});
	};

	handleMessage = (
		e: MessageEvent<{
			id: number;
			method: string;
			params: {
				autoApprove: boolean;
				publicKey: string;
			};
			result?: string;
			error?: string;
		}>,
	): void => {
		if (
			(this._injectedProvider && e.source === window) ||
			(e.origin === this._providerUrl?.origin && e.source === this._popup)
		) {
			if (e.data.method === 'connected') {
				const newPublicKey = e.data.params.publicKey;
				if (!this._publicKeyHex || !(this._publicKeyHex === newPublicKey)) {
					if (this._publicKeyHex && !(this._publicKeyHex === newPublicKey)) {
						this.handleDisconnect();
					}
					this._publicKeyHex = newPublicKey;
					this.emit('connect', this.publicKeyHex);
				}
			} else if (e.data.method === 'disconnect') {
				this.handleDisconnect();
			} else if (e.data.result || e.data.error) {
				const promises = this._response.get(e.data.id);
				if (promises) {
					const [resolve, reject] = promises;
					e.data.result ? resolve(e.data.result) : reject(new Error(e.data.error));
				}
			}
		}
	};
}
