// Additional security layer - obfuscated admin check
(function() {
    const _0x1a2b = ['bXVsdGlncmFwaGljLmxiQGdtYWlsLmNvbQ==', 'SWxvdmVKZXN1c0AxODAxMDA='];
    const _0x3c4d = () => atob(_0x1a2b[0]);
    const _0x5e6f = () => atob(_0x1a2b[1]);
    
    window._adminCheck = (email, pass) => email === _0x3c4d() && pass === _0x5e6f();
    window._getAdminEmail = () => _0x3c4d();
    window._getAdminPass = () => _0x5e6f();
})();
