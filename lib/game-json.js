const fs = require('fs')

module.exports = class GameJson {
    constructor(filePath) {
        this._filePath = filePath

        this._deps = this.deserialize() || {}
    }

    setDependency(key, val) {
        return this._deps[key] = val
    }

    dependencies() {
        return this._deps
    }

    save() {
        return new Promise((resolve, reject) => {
            fs.writeFile(this._filePath, this.serialize(), (err) => {
                reject(err)
            })
        })
    }

    deserialize() {
        if (!fs.existsSync(this._filePath)) {
            return {}
        } else {
            return JSON.parse(fs.readFileSync(this._filePath))
        }
    }

    serialize() {
        return JSON.stringify({
            dependencies: this._deps
        })
    }
}