// Additional security layer - obfuscated admin check
(function() {
    const _0x1a2b = ['bXVsdGlncmFwaGljLmxiQGdtYWlsLmNvbQ==', 'SWxvdmVKZXN1c0AxODAxMDA='];
    const _0x7g8h = ['YXJhbWNvdGFsZWVk', 'QXJhbWNvVGFsZWVkQDEyMzQ='];
    
    const _0x3c4d = () => atob(_0x1a2b[0]);
    const _0x5e6f = () => atob(_0x1a2b[1]);
    const _0x9i0j = () => atob(_0x7g8h[0]);
    const _0x1k2l = () => atob(_0x7g8h[1]);
    
    window._adminCheck = (email, pass) => {
        return (email === _0x3c4d() && pass === _0x5e6f()) || 
               (email === _0x9i0j() && pass === _0x1k2l());
    };
    
    window._getAdminEmail = () => _0x3c4d();
    window._getAdminPass = () => _0x5e6f();
    window._getAramcoUser = () => _0x9i0j();
    window._getAramcoPass = () => _0x1k2l();
})();
