export type InjectedProvider = { postMessage: (params: unknown) => void };

export const isObject = (a: unknown): a is Record<string, unknown> => {
	return typeof a === 'object' && a !== null;
};

export const isInjectedProvider = (a: unknown): a is InjectedProvider => {
	return isObject(a) && 'postMessage' in a && typeof a.postMessage === 'function';
};
