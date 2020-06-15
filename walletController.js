class WalletController {
    constructor() {
        this.walletConnection = new WalletConnectionRequest()
        this.events = new MyEventEmitter()
        this.installed = null;
        this.locked = null;
        this.approvals = {}
        document.addEventListener('lamdenWalletInfo', (e) => {
            this.events.emit('newInfo', e.detail)
            let data = e.detail;
            if (!data.errors){
                if (typeof data.installed !== 'undefined') this.installed = data.installed
                if (typeof data.locked !== 'undefined') this.locked = data.locked
                if (data.wallets.length > 0) this.walletAddress = data.wallets[0]
                if (typeof data.approvals !== 'undefined') this.approvals = data.approvals
            }
        })
    }
    getInfo(){
        document.dispatchEvent(new CustomEvent('lamdenWalletGetInfo'));
    }
    walletIsInstalled(){
        return new Promise((resolve, reject) => {
            const handleWalletInstalled = () => {
                this.installed = true;
                resolve(true);
                document.removeEventListener("lamdenWalletInfo", handleWalletInstalled);
            }
            document.addEventListener('lamdenWalletInfo', handleWalletInstalled, { once: true })
            document.dispatchEvent(new CustomEvent('lamdenWalletGetInfo'));
        })
    }
    createConnection(info){
        this.walletConnection = new WalletConnectionRequest(info)
        return this.walletConnection
    }
    sendConnection(){
        return new Promise((resolve, reject) => {
            const handleConnecionResponse = (e) => {
                if (e.detail.errors) {
                    reject(e.detail.errors)
                }
                else {
                    this.info = e.detail;
                    this.events.emit('newInfo', e.detail)
                    resolve(e.detail);
                }
                document.removeEventListener("lamdenWalletInfo", handleConnecionResponse);
            }
            document.addEventListener('lamdenWalletInfo', handleConnecionResponse, { once: true })
            console.log(this.walletConnection.info())
            document.dispatchEvent(new CustomEvent('lamdenWalletConnect', {detail: this.walletConnection.info()}));
        })
    }
  }

class WalletConnectionRequest {
    constructor(info = {}) {
        const isUndefined = (value) => typeof value === "undefined";
        const populate = (info) => {
            Object.keys(info).forEach(p => {
                if (!isUndefined(this[p])) this[p] = info[p]
            })
        }
        this.appName = "";
        this.description = "";
        this.contractName = "";
        this.networkType = "";
        this.logo = "";
        this.background = "";
        this.approvalHash = "";
        this.reapprove = false;
        this.newKeypair = false;
        this.charms = []
        this.preApproval = {
            stampsToPreApprove: 0, 
            message: ""
        }
        try{
            populate(info)
        }catch (e){
            console.log(e)
        }
    }
    info(){
        let info = {appName: this.appName, description: this.description, contractName: this.contractName, networkType: this.networkType, logo: this.logo}
        if (this.background.length > 0) info.background = this.background
        if (this.charms.length > 0) info.charms = this.charms
        if (this.preApproval.stampsToPreApprove > 0) info.preApproval = this.preApproval
        if (this.reapprove == true) {
            info.reapprove = true
            if (this.newKeypair == true) {
                info.newKeypair = true
            }
        }
        return JSON.stringify(info)
    }
}

class MyEventEmitter {
    constructor() {
      this._events = {};
    }
  
    on(name, listener) {
        //console.log({name, listener})
      if (!this._events[name]) {
        this._events[name] = [];
      }
  
      this._events[name].push(listener);
    }
  
    removeListener(name, listenerToRemove) {
      if (!this._events[name]) {
        throw new Error(`Can't remove a listener. Event "${name}" doesn't exits.`);
      }
  
      const filterListeners = (listener) => listener !== listenerToRemove;
  
      this._events[name] = this._events[name].filter(filterListeners);
    }
  
    emit(name, data) {
        //console.log({name, data})
      if (!this._events[name]) {
        throw new Error(`Can't emit an event. Event "${name}" doesn't exits.`);
      }
  
      const fireCallbacks = (callback) => {
        callback(data);
      };
  
      this._events[name].forEach(fireCallbacks);
    }
  }

module.exports = WalletController;