/**
 * Phong 360 Engine — Typed Event Emitter
 *
 * Lightweight pub/sub for engine events. Handlers fire in registration order.
 * A throwing handler does not block subsequent handlers (error is logged).
 *
 * @version 5.0.0-rc.1
 * @license MIT
 */

class TypedEventEmitter {
	constructor() {
		/** @type {Map<string, Function[]>} */
		this._listeners = new Map();
	}

	/**
	 * Register an event handler. Returns an unsubscribe function.
	 *
	 * @param {string} event
	 * @param {Function} handler
	 * @returns {Function} unsubscribe — call to remove this handler
	 */
	on(event, handler) {
		if (!this._listeners.has(event)) {
			this._listeners.set(event, []);
		}
		this._listeners.get(event).push(handler);
		return () => this.off(event, handler);
	}

	/**
	 * Remove a previously registered handler.
	 *
	 * @param {string} event
	 * @param {Function} handler
	 */
	off(event, handler) {
		const handlers = this._listeners.get(event);
		if (!handlers) return;
		const idx = handlers.indexOf(handler);
		if (idx !== -1) handlers.splice(idx, 1);
		if (handlers.length === 0) this._listeners.delete(event);
	}

	/**
	 * Emit an event to all registered handlers.
	 *
	 * @param {string} event
	 * @param {*} [payload]
	 */
	emit(event, payload) {
		const handlers = this._listeners.get(event);
		if (!handlers || handlers.length === 0) return;
		const copy = handlers.slice();
		for (const handler of copy) {
			try {
				handler(payload);
			} catch (e) {
				console.error(`[Phong360] Error in "${event}" handler:`, e);
			}
		}
	}

	/**
	 * Remove all listeners for a specific event, or all events if none given.
	 *
	 * @param {string} [event]
	 */
	removeAllListeners(event) {
		if (event) {
			this._listeners.delete(event);
		} else {
			this._listeners.clear();
		}
	}

	/**
	 * Return the number of listeners registered for an event.
	 *
	 * @param {string} event
	 * @returns {number}
	 */
	listenerCount(event) {
		const handlers = this._listeners.get(event);
		return handlers ? handlers.length : 0;
	}
}

// Avoid polluting global if loaded as a module — but expose for script-tag usage.
if (typeof window !== 'undefined') {
	window.TypedEventEmitter = TypedEventEmitter;
}

// ESM / CJS export compatibility
if (typeof module !== 'undefined' && module.exports) {
	module.exports = TypedEventEmitter;
}
