const path = require('path')
const UnityAuthenticationClient = require('unity-package-authentication').UnityAuthenticationClient
const UnityDecryptClient = require('unity-package-decrypt').UnityDecryptClient
const UnityDownloadClient = require('unity-package-download').UnityDownloadClient
const UnityExtractClient = require('unity-package-extract').UnityExtractClient
const UnitySearchClient = require('unity-package-search').UnitySearchClient
const GameJson = require('./game-json')
const del = require('del')
const write = require('write')
const stream = require('stream')
const rc = require('rc')

module.exports = class UnityPackageManager {
    static get defaultModuleDirectory() {
        return 'unity_modules'
    }

    static get defaultModuleTempDirectory() {
        return '.temp'
    }

    static get defaultLang() {
        return 'en-US'
    }

    static get freeLicenseHash() {
        return UnityAuthenticationClient.freeLicenseHash
    }

    constructor() {
        this._config = rc('upm', {
            moduleDirectory: UnityPackageManager.defaultModuleDirectory,
            moduleTempDirectory: UnityPackageManager.defaultModuleTempDirectory,
            langId: UnityPackageManager.defaultLang
        })
        this._gameJson = new GameJson(path.join(process.cwd(), 'game.json'))
        this._auth = new UnityAuthenticationClient(this.config('langId'))
        this._search = new UnitySearchClient(this._auth, this.config('langId'))
        this._decrypt = new UnityDecryptClient()
        this._extract = new UnityExtractClient()
        this._sessionId = this._config.sessionId || null
    }

    login(username, password, licenseHash, hardwareHash) {
        return this._auth.authenticate(username, password, licenseHash, hardwareHash)
            .then((sessionId) => {
                this._sessionId = sessionId

                return sessionId
            })
    }

    config(key) {
        return this._config[key]
    }

    search(query, maxResults, resultsSorter) {
        return this._search.search(query, maxResults, resultsSorter)
    }

    install(...packageIds) {
        let proms = []

        packageIds.forEach((pkg) => {
            proms.push(this.installSingle(pkg).then(() => this.saveSingle(pkg)))
        })

        return Promise.all(proms).then((res) => {
            return this._gameJson.save()
        })
    }

    installSingle(packageId) {
        return new UnityDownloadClient(this._sessionId, this.config('langId'))
            .downloadMeta(packageId)
            .then((meta) => {
                const key = meta.key
                const installPath = path.join(process.cwd(),
                    this.config('moduleDirectory'))
                const extractPath = path.join(installPath,
                    this.config('moduleTempDirectory'),
                    packageId.toString())

                const dStream = key != null && key.length > 0 ?
                    this._decrypt.createDecryptStream(key) : new stream.PassThrough()
                const eStream = this._extract.createExtractStream(extractPath)

                return new Promise((resolve, reject) => {
                    meta.downloadAsset().pipe(dStream).pipe(eStream).on('finish', () => {
                        resolve()
                    }).on('error', (err) => {
                        reject(err)
                    })
                }).then(() => {
                    return this._extract.convert(extractPath, installPath)
                }).then(() => {
                    return del(extractPath, {
                        force: true
                    }).then(() => {
                        return packageId
                    })
                })
            })
    }

    lookupSingle(packageId) {
        return this._search.lookup(packageId)
    }

    saveSingle(packageId, versionData) {
        let versionPromise = null

        if (versionData) {
            versionPromise = Promise.resolve(versionData)
        } else {
            versionPromise = this._search.lookup(packageId)
        }

        return versionPromise
            .then((data) => {
                this._gameJson.setDependency(`${packageId}#${data.title}`, data.version)
            })
    }
}