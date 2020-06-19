class WalletController {
    constructor() {
        this.connectionRequest = undefined
        this.events = new MyEventEmitter()
        this.installed = null;
        this.locked = null;
        this.approvals = {}
        document.addEventListener('lamdenWalletInfo', (e) => {
            let data = e.detail;
            if (!data.errors){
                if (typeof data.installed !== 'undefined') this.installed = data.installed
                if (typeof data.locked !== 'undefined') this.locked = data.locked
                if (data.wallets.length > 0) this.walletAddress = data.wallets[0]
                if (typeof data.approvals !== 'undefined') this.approvals = data.approvals
            }
            this.events.emit('newInfo', e.detail)
        })
        document.addEventListener('lamdenWalletTxStatus', (e) => {
            this.events.emit('txStatus', e.detail)
            let data = e.detail;
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
            setTimeout(() => {
                if (!this.installed) resolve(false);
            }, 1000)
        })
    }
    createConnection(request){
        this.connectionRequest = new WalletConnectionRequest(request)
        return this.connectionRequest
    }
    sendConnection(request){
        if (request && !this.connectionRequest) this.createConnection(request)
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
            document.dispatchEvent(new CustomEvent('lamdenWalletConnect', {detail: this.connectionRequest.info()}));
        })
    }
    sendTransaction(tx){
        return new Promise((resolve, reject) => {
            const handleConnecionResponse = (e) => {
                if (e.detail.errors) {
                    reject(e.detail.errors)
                }
                else {
                    resolve(e.detail);
                }
            }
            document.dispatchEvent(new CustomEvent('lamdenWalletSendTx', {detail: JSON.stringify(tx)}));
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
        this.request = info
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
            throw new Error(e.message)
        }
    }
    info(){
        let info = {
            appName: this.appName, 
            description: this.description, 
            contractName: this.contractName, 
            networkType: this.networkType, logo: this.logo}
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
      if (!this._events[name]) {
        this._events[name] = [];
      }
  
      this._events[name].push(listener);
    }
  
    removeListener(name, listenerToRemove) {
      if (!this._events[name]) {
        return
      }
  
      const filterListeners = (listener) => listener !== listenerToRemove;
  
      this._events[name] = this._events[name].filter(filterListeners);
    }
  
    emit(name, data) {
      if (!this._events[name]) {
        return
      }
  
      const fireCallbacks = (callback) => {
        callback(data);
      };
  
      this._events[name].forEach(fireCallbacks);
    }
  }

module.exports = WalletController;