const state = {
    status: 'initializing',
    qr: null,
    user: null,
}

const setQrPending = (qr) => {
    state.status = 'qr_pending';
    state.qr = qr;
    state.user = null;
};

const setConnected = (user) => {
    state.status = 'connected';
    state.qr = null;
    state.user = user;
};

const clearState = () => {
    state.status = 'disconnected';
    state.qr = null;
    state.user = null;
};

module.exports = {
    state,
    setQrPending,
    setConnected,
    clearState
};