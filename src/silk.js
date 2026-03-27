module.exports = function() {
    var silkModule = null;
    var silkModuleUrl = '';

    function isSilkHeader(u8Array) {
        if (!u8Array || u8Array.length < 9) {
            return false;
        }
        var header0 = bytesToAscii(u8Array, 0, 9);
        if (header0 === '#!SILK_V3') {
            return true;
        }
        return u8Array[0] === 0x02 && bytesToAscii(u8Array, 1, 9) === '#!SILK_V3';
    }

    function bytesToAscii(u8Array, start, len) {
        var out = '';
        var end = Math.min(u8Array.length, start + len);
        for (var i = start; i < end; i++) {
            out += String.fromCharCode(u8Array[i]);
        }
        return out;
    }

    function pcmS16leToFloat32(pcmBytes) {
        var byteLength = pcmBytes.byteLength - (pcmBytes.byteLength % 2);
        var sampleLength = Math.floor(byteLength / 2);
        var view = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, byteLength);
        var out = new Float32Array(sampleLength);
        for (var i = 0; i < sampleLength; i++) {
            out[i] = view.getInt16(i * 2, true) / 32768;
        }
        return out;
    }

    function normalizeModule(mod) {
        if (!mod) {
            return null;
        }
        return mod.default || mod;
    }

    function getSilkModule(moduleUrl) {
        if (silkModule && silkModuleUrl === moduleUrl) {
            return Promise.resolve(silkModule);
        }
        if (!moduleUrl) {
            return Promise.reject(new Error('silk module url is required.'));
        }
        silkModuleUrl = moduleUrl;
        return import(moduleUrl).then(function(mod) {
            silkModule = normalizeModule(mod);
            if (!silkModule || typeof silkModule.decode !== 'function') {
                throw new Error('silk module decode() is not available.');
            }
            return silkModule;
        });
    }

    function postDecodeResult(samples, sampleRate) {
        self.postMessage({
            samples: samples,
            sampleRate: sampleRate
        });
    }

    self.onmessage = function(e) {
        var data = e.data || {};
        switch (data.command) {
            case 'decode': {
                var input = data.buffer instanceof Uint8Array ? data.buffer : new Uint8Array(data.buffer || 0);
                if (!input.length) {
                    self.postMessage({error: 'Empty silk buffer.'});
                    return;
                }
                if (!isSilkHeader(input)) {
                    self.postMessage({error: 'Invalid silk-v3 header.'});
                    return;
                }

                var targetSampleRate = data.sampleRate || 24000;
                getSilkModule(data.moduleUrl).then(function(moduleApi) {
                    return moduleApi.decode(input, targetSampleRate);
                }).then(function(decoded) {
                    if (!decoded || !decoded.data || !decoded.data.length) {
                        throw new Error('silk decoder returned empty pcm.');
                    }
                    var samples = pcmS16leToFloat32(decoded.data);
                    postDecodeResult(samples, targetSampleRate);
                }).catch(function(err) {
                    self.postMessage({
                        error: err && err.message ? err.message : 'Failed to decode silk audio.'
                    });
                });
                break;
            }
            default:
        }
    };
};
