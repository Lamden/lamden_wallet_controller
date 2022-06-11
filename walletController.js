'use strict'


const LAMDEN_MOBILE_WALLET_URL = "https://lamdenwallet.com";


class WalletController {
    /**
     * Lamden Wallet Controller Class
     *
     * This Class interfaces with the Lamden Wallet's content script. It provids helper methods for creating a connection,
     * getting wallet info, sending transactions and retreiving tx information.
     *
     * The connection information for your DAPP can be supplied now or later by calling "sendConnection" manually.
     *
     * IMPORTANT: The window object needs to be available when creating this instance as it will attempt to create listeners.
     *
     *
     * @param {Object|undefined} connectionRequest  A connection request object
     * @param {string} connectionRequest.appName The name of your dApp
     * @param {string} connectionRequest.version Connection version. Older version will be over-written in the uers's wallet.
     * @param {string} connectionRequest.contractName The smart contract your DAPP will transact to
     * @param {string} connectionRequest.networkType Which Lamden network the approval is for (mainnet or testnet) are the only options
     * @param {string} connectionRequest.logo The reletive path of an image on your webserver to use as a logo for your Lamden Wallet Linked Account
     * @param {string=} connectionRequest.background The reletive path of an image on your webserver to use as a background for your Lamden Wallet Linked Account
     * @param {string=} connectionRequest.charms.name Charm name
     * @param {string=} connectionRequest.charms.variableName Smart contract variable to pull data from
     * @param {string=} connectionRequest.charms.key Key assoicated to the value you want to lookup
     * @param {string=} connectionRequest.charms.formatAs What format the data is
     * @param {string=} connectionRequest.charms.iconPath An icon to display along with your charm
     * @param {boolean=} chromeExtension A flag of whether to use the Chrome extension or mobile-friendly browser wallet
     * @fires newInfo
     * @return {WalletController}
     */
    constructor(connectionRequest = undefined, chromeExtension = true) {
        this.connectionRequest = connectionRequest ? new WalletConnectionRequest(connectionRequest) : null;
        this.events = new MyEventEmitter();
        this.installed = null;
        this.locked = null;
        this.approvals = {};
        this.approved = false;
        this.autoTransactions = false;
        this.walletAddress = ""
        this.callbacks = {};
        this.popup = null;
        this.chromeExtension = chromeExtension;
        document.addEventListener('lamdenWalletInfo', (e) => {
            this.installed = true;
            let data = e.detail;

            if (data){
                if (!data.errors){
                    if (typeof data.locked !== 'undefined') this.locked = data.locked

                    if (data.wallets.length > 0) this.walletAddress = data.wallets[0]
                    if (typeof data.approvals !== 'undefined') {
                        this.approvals = data.approvals
                        let approval = this.approvals[this.connectionRequest?.networkType]
                        if (approval){
                            if (approval.contractName === this.connectionRequest.contractName){
                                this.approved = true;
                                this.autoTransactions = approval.trustedApp
                            }
                        }
                    }
                }else{
                    data.errors.forEach(err => {
                        if (err === "Wallet is Locked") this.locked = true
                    })
                }
                this.events.emit('newInfo', e.detail)
            }
        })
        document.addEventListener('lamdenWalletTxStatus', (e) => {
            const { data } = e.detail
            if (data) {
                let txResult = data

                const { errors, status, rejected, txData, txBlockResult } = txResult
    
                if (errors){
                    if (errors.length > 0) {
                        let { uid } = txData
    
                        if (status === "Transaction Cancelled" && rejected){
                            let rejectedTxData = JSON.parse(rejected)
                            uid = rejectedTxData.uid
                        }
                        if (uid){
                            if (this.callbacks[uid]) this.callbacks[uid](e.detail)
                        }
                    }
                }else{
                    if (txBlockResult && Object.keys(txBlockResult).length > 0){
                        const { uid } = txResult

                        if (uid && this.callbacks[uid]) this.callbacks[uid](e.detail)
                    }
                }
            }

            this.events.emit('txStatus', e.detail)
        })
    }
    /**
     * Creates a "lamdenWalletGetInfo" CustomEvent to ask the Lamden Wallet for the current information.
     * This will fire the "newInfo" events.on event
     *
     * @fires newInfo
     */
    getInfo(){
        document.dispatchEvent(new CustomEvent('lamdenWalletGetInfo'));
    }
    /**
     * Check if the Lamden Wallet extention is installed in the user's broswer.
     *
     * This will fire the "newInfo" events.on event
     * @fires newInfo
     * @return {Promise} Wallet is Installed.
     */
    walletIsInstalled(){
        return new Promise((resolve, reject) => {
            const handleWalletInstalled = (e) => {
                this.installed = true;
                if (this.chromeExtension) {
                    this.events.emit('installed', true)
                }
                document.removeEventListener("lamdenWalletInfo", handleWalletInstalled);
                if (this.connectionRequest !== null) this.sendConnection();
                resolve(true);
            }
            document.addEventListener('lamdenWalletInfo', handleWalletInstalled, { once: true })
            if (this.chromeExtension) {
                this.getInfo();
                setTimeout(() => {
                    if (!this.installed) resolve(false);
                }, 1000)
            } else {
                return this.loginMobile();
            }
        })
    }
    /**
     * Store connectionRequest information but don't sent
     * If the connectionRequest object wasn't supplied to the construtor then it can be supplied or updated here
     *
     * @param {Object} connectionRequest  A connection request object
     * @return {undefined}
     */
    storeConnectionRequest(connectionRequest){
        if (!connectionRequest) throw new Error("no connection request provided")
        this.connectionRequest = new WalletConnectionRequest(connectionRequest)
    }
    /**
     * Send a connection to the Lamden Wallet for approval.
     * If the connectionRequest object wasn't supplied to the construtor then it must be supplied here.
     *
     * This will fire the "newInfo" events.on event
     * @param {Object|undefined} connectionRequest  A connection request object
     * @param {string} connectionRequest.appName The name of your dApp
     * @param {string} connectionRequest.version Connection version. Older version will be over-written in the uers's wallet.
     * @param {string} connectionRequest.contractName The smart contract your dApp will transact through
     * @param {string} connectionRequest.networkType Which Lamden network the approval is for (Mainnet or testnet)
     * @param {string=} connectionRequest.background A reletive path to an image to override the default lamden wallet account background
     * @param {string} connectionRequest.logo A reletive path to an image to use as a logo in the Lamden Wallet
     * @param {string=} connectionRequest.charms.name Charm name
     * @param {string=} connectionRequest.charms.variableName Smart contract variable to pull data from
     * @param {string=} connectionRequest.charms.key Key assoicated to the value you want to lookup
     * @param {string=} connectionRequest.charms.formatAs What format the data is
     * @param {string=} connectionRequest.charms.iconPath An icon to display along with your charm
     * @fires newInfo
     * @return {Promise} The User's Lamden Wallet Account details or errors from the wallet
     */
    sendConnection(connectionRequest = undefined){
        if (connectionRequest) this.connectionRequest = new WalletConnectionRequest(connectionRequest)
        if (this.connectionRequest === null) throw new Error('No connetionRequest information.')
        return new Promise((resolve) => {
            const handleConnecionResponse = (e) => {
                this.events.emit('newInfo', e.detail)
                resolve(e.detail);
                document.removeEventListener("lamdenWalletInfo", handleConnecionResponse);
            }
            document.addEventListener('lamdenWalletInfo', handleConnecionResponse, { once: true })
            if (this.chromeExtension) {
                document.dispatchEvent(new CustomEvent('lamdenWalletConnect', {detail: this.connectionRequest.getInfo()}));
            }
        })
    }
    /**
     * Creates a "lamdenWalletSendTx" event to send a transaction request to the Lamden Wallet.
     * If a callback is specified here then it will be called with the transaction result.
     *
     * This will fire the "txStatus" events.on event
     * @param {Object} tx  A connection request object
     * @param {string} tx.networkType Which Lamden network the tx is for (Mainnet or testnet)
     * @param {string} tx.stampLimit The max Stamps this tx is allowed to use. Cannot be more but can be less.
     * @param {string} tx.methodName The method on your approved smart contract to call
     * @param {Object} tx.kwargs A keyword object to supply arguments to your method
     * @param {Function=} callback A function that will called and passed the tx results.
     * @fires txStatus
     */
    sendTransaction(tx, callback = undefined){
        tx.uid = new Date().toISOString()
        if (typeof callback === 'function') this.callbacks[tx.uid] = callback
        if (this.chromeExtension) {
            document.dispatchEvent(new CustomEvent('lamdenWalletSendTx', {detail: JSON.stringify(tx)}));
        } else {
            var params = {
                contractName: tx.contractName,
                methodName: tx.methodName,
                stampLimit: tx.stampLimit.toString(),
                kwargs: JSON.stringify(tx.kwargs),
                origin: window.location.href,
                type: "sign",
            }
            var url = (
                LAMDEN_MOBILE_WALLET_URL
                + "?contractName=" + encodeURIComponent(params.contractName)
                + "&methodName=" + encodeURIComponent(params.methodName)
                + "&stampLimit=" + encodeURIComponent(params.stampLimit)
                + "&kwargs=" + encodeURIComponent(params.kwargs)
                + "&origin=" + encodeURIComponent(params.origin)
                + "&type=sign"
            );
            this.openWalletPopup(url, params, tx.uid, (data)=>{
                this.callbacks[tx.uid]({data: data})
            })
        }
    }
    /**
     * Logs a user into their browser-compatible wallet
     *
     * This will fire the "newInfo" events.on event
     * @fires newInfo
     * @return {Promise} The User's Lamden Wallet Account details or errors from the wallet
     */
    loginMobile() {
        var url = (
            LAMDEN_MOBILE_WALLET_URL
            + "?origin=" + encodeURIComponent(window.location.href)
            + "&type=login"
        );
        this.openWalletPopup(url, null, new Date().toISOString(), (data)=>{
            if (data.type && data.type==="vk") {
                document.dispatchEvent(new CustomEvent('lamdenWalletInfo', {detail: {wallets: [data.vk]}}));
                return;
            }
        });
    }
    /**
     * If a user is using the mobile-compatible browser wallet, a popup will be opened (if not already exists)
     * allowing them to approve connections and transactions.
     *
     * @param {string} url  The url of the popup to open
     * @param {Object} message The parameters to pass to the browser wallet
     * @param {string} uid The uid of the transaction
     * @param {Function=} callback A function that will called and passed the tx results.
     */
    openWalletPopup(url, message, uid, callback) {
        const eventHandler = (event) => {
            if (event.origin !== LAMDEN_MOBILE_WALLET_URL)
                return;
            if (event.data.uid && event.data.uid !== uid) {
                return;
            }
            if (message !== null && event.data.payload) {
                if (message.contractName !== event.data.payload.contract 
                    || message.methodName !== event.data.payload.function) {
                    return;
                }
            }
            callback(event.data);
            window.removeEventListener("message", eventHandler);
        };
        window.addEventListener("message", eventHandler, false);
        if (this.popup === null || this.popup.closed || message === null) {
            this.popup = window.open(
                url,
                "LamdenWallet"
            );
        } else {
            this.popup.postMessage({
                jsonrpc: '2.0',
                uid: uid,
                ...message
            }, LAMDEN_MOBILE_WALLET_URL);
        }
    }
}

class WalletConnectionRequest {
    /**
     * Wallet Connection Request Class
     *
     * Validates and stores the information from a connectionRequest object.  See WalletController constructor for connection request params.
     * @param {Object} connectionRequest  - request object
     * @return {WalletConnectionRequest}
     */
    constructor(connectionRequest = {}) {
        const isUndefined = (value) => typeof value === "undefined";
        const populate = (request) => {
            Object.keys(request).forEach(p => {
                if (!isUndefined(this[p])) this[p] = request[p]
            })
        }
        this.request = connectionRequest
        this.appName = "";
        this.version = "";
        this.contractName = "";
        this.networkType = "";
        this.logo = "";
        this.background = "";
        this.charms = []
        try{
            populate(connectionRequest)
        }catch (e){
            console.log(e)
            throw new Error(e.message)
        }
    }
    /**
     * Get a JSON string of the approval request information
     * @return {string} - JSON string of all request information
     */
    getInfo(){
        let info = {
            appName: this.appName,
            version: this.version,
            contractName: this.contractName,
            networkType: this.networkType, logo: this.logo}
        if (this.background.length > 0) info.background = this.background
        if (this.charms.length > 0) info.charms = this.charms
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