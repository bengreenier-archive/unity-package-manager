const assert = require('assert')
const UnityAuthenticationClient = require('unity-package-authentication').UnityAuthenticationClient
const UnityPackageManager = require('../').UnityPackageManager
const del = require('del')

const testCreds = require('unity-package-authentication/test/constants')

describe('UnityPackageManager', () => {
    it('should define some statics', () => {
        assert.equal(UnityPackageManager.defaultModuleDirectory, 'unity_modules')
        assert.equal(UnityPackageManager.defaultModuleTempDirectory, '.temp')
        assert.equal(UnityPackageManager.defaultLang, 'en-US')
        assert.equal(UnityPackageManager.freeLicenseHash, UnityAuthenticationClient.freeLicenseHash)
    })

    it('should read config', () => {
        const client = new UnityPackageManager()

        assert.ok(client.config('langId') != null)
        assert.ok(client.config('moduleDirectory') != null)
        assert.ok(client.config('moduleTempDirectory') != null)
    })

    it('should login', (done) => {
        const client = new UnityPackageManager()

        client.login(testCreds.testUsername, testCreds.testPassword)
            .then((sessionId) => {
                assert.ok(sessionId != null)

                done()
            }, done)
    })

    it('should search', (done) => {
        const client = new UnityPackageManager()

        client.search('unity')
            .then((results) => {
                assert.ok(results.length > 0)

                done()
            }, done)
    })

    it('should install', (realDone) => {
        del.sync([UnityPackageManager.defaultModuleDirectory, 'game.json'], { force: true })
        done = (res) => {
            del.sync([UnityPackageManager.defaultModuleDirectory, 'game.json'], { force: true })
            realDone(res) 
        }

        const client = new UnityPackageManager()

        client.login(testCreds.testUsername, testCreds.testPassword)
            .then(() => {
                return client.install(32351)
            })
            .then((installDir) => {
                assert.ok(installDir != null)

                done()
            }, done)
    }).timeout(30 * 1000)
})