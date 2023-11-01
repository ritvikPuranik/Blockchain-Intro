const crypto = require('crypto');
const uuid = require('uuid');

let nodeAddress = ''; // hashed value of currentAddress
class BlockchainSchema{
    constructor(){
        this.length = 0;
        this.chain = [];
        this.transactions = [];//mempool -> all the transactions are first stored here before getting mined
        this.nodes = new Set();
        this.currentAddress = '';//Populated in addNode()
    }

    createBlock = async() =>{
        if(this.transactions.length === 0){ // Mempool empty
            return null;
        }

        const timeStamp = new Date();
        let block = {
            index: this.length+1,
            timestamp: timeStamp.getTime(),
            data: this.transactions,
            nonce: -1, //this gets computed below, now just initialized
            prevHash: this.getPrevHash(),
        }

        if(await this.replaceChain()){ //Block mining attempt failed
            console.log("chain has been replaced------");
            return {
                block: block,
                status: false
            };

        }else{ //The miner has the longest chain -> his block gets mined
            let minerReward = {
                sender: nodeAddress,
                receiver: 'Ritvik',
                amount: 10
            }

            this.clearTransactions();
            block = {
                ...block,
                nonce: this.computeNonce(block),
                curHash: this.getCurrentHash(block),
                data: [...block.data, minerReward]// We want to add miner reward but not necessarily broadcast it -> it is rewarded in the last step
            }
            this.chain.push(block);
            this.length++;
            console.log("Current chain>>", this.chain);
            return {
                block: block,
                status: true
            };
        }
    }

    addTransaction = ({sender, receiver, amount}) =>{
        if(!this.nodes.has(this.currentAddress)){
            console.log("Added transaction cannot be broadcasted. Did you register the nodes?");
        }

        let transaction = {
            sender: sender,
            receiver: receiver,
            amount: amount
        };

        let txnPresent = this.transactions.filter(txn => JSON.stringify(txn)===JSON.stringify(transaction));
        console.log("transaction aleady present????", txnPresent);
        if(txnPresent[0]){
            return; // This prevents infinite loop in broadcasting -> if transaction is already part of the list, exit right away
        }

        this.transactions.push(transaction);
        console.log("latest transaction list>", this.transactions);
        this.broadcast(transaction, 'add_transaction');
        return {
            transaction: transaction,
            index: this.chain.length + 1 // index of block that will receive the transaction
        };
    }

    addNode = async(addresses, currentAddress) =>{
        this.currentAddress = currentAddress;
        nodeAddress = crypto.createHash('sha256').update(this.currentAddress).digest('hex');
        let alreadyPresent = addresses.every(item => this.nodes.has(item));
        if(alreadyPresent){
            return; // This prevents infinite loop in broadcasting -> if node is already part of network, exit right away
        }

        addresses.forEach(address =>{
            this.nodes.add(address); //full address should be fine
        })
        console.log("latest set of nodess>", this.nodes);

        let nodesArray = Array.from(this.nodes);
        let dataToBroadcast = {
            "addresses": nodesArray,
        }
        await this.broadcast(dataToBroadcast, 'register');
    }

    getPrevHash = () =>{
        if(this.length === 0) return '0';
        return this.chain[this.length-1].curHash;
    }

    getCurrentHash = (block) =>{
        let blockString = JSON.stringify(block);
        const sha256Hash = crypto.createHash('sha256').update(blockString).digest('hex');
        return sha256Hash;
    }

    getPrevBlock = () =>{
        return this.chain[this.length-1];
    }

    getChain = () =>{
        return this.chain;
    }

    computeNonce = (block) =>{
        let prevNonce, prevBlock;
        if(this.length === 0){
            prevNonce = 0;  
        }else{
            prevBlock = this.getPrevBlock();
            prevNonce = prevBlock.nonce;
        } 
        let sha256Hash;
        do{
            block.nonce++;
            let blockString = JSON.stringify(block);
            sha256Hash = crypto.createHash('sha256').update(blockString).digest('hex');   
        }while(sha256Hash.slice(0,1)!=='0');
        console.log("golden nonce>>", block.nonce);
        console.log("obtained hash>>", sha256Hash);
        return block.nonce;
    }

    isChainValid = (chain) =>{ //this is used to validate chains from other networks as well, thats why take the chain as argument
        // let prevBlock = {};
        // let validChain = true;
        // chain.map(block =>{
        //     //2 conditions -> if previous block hash equals previous hash key of current block. if current hash has 1 leading zero
        //     if(block.prevHash !== '0'){//genesis block this logic wont apply
        //         let prevBlockHashed = crypto.createHash('sha256').update(JSON.stringify(prevBlock)).digest('hex');
        //         if(block.prevHash !== prevBlockHashed){
        //             validChain = false;
        //             return false;
        //         }
        //     }
        //     let curBlockHashed = crypto.createHash('sha256').update(JSON.stringify(block)).digest('hex');
        //     if(curBlockHashed.slice(0,1)!=='0'){
        //         validChain = false;
        //         return false;
        //     }
        //     prevBlock = block;
        // })
        // return validChain; 
        return true;
    }

    clearTransactions = async() =>{
        console.log("mempool before clearing>>>", this.transactions);
        if(!this.transactions[0]){ //break condition for recursive case
            return;
        }

        this.transactions = [];
        //broadcast it as well, since the block has been mined, the transactions are no longer needed in mempool
        this.broadcast(null, 'clear_mempool', {method: 'DELETE'});
    }

    replaceChain = async() =>{
        console.log("Inside replaceChain()--------------")
        let network = Array.from(this.nodes);
        let indexOfAddress = network.indexOf(this.currentAddress);
        network.splice(indexOfAddress, 1); // we dont want to call the endpoint for the same server

        let longestChain = this.chain;
        let isReplaced = false;
        let computeLongestChain = network.map(async(node) =>{
            console.log("node>", node);
            let options = {
                method: 'GET'
            }
            console.log("url for node>>", `${node}/get_chain`);
            console.log("optionss>", options);
            let response = await fetch(`${node}/get_chain`, options);
            response = await response.json();
            console.log("get_chain response>>", response.chain.length);
            console.log("longest chain so far>>", longestChain.length);
            console.log("chain valid method output>>>", this.isChainValid(response.chain));

            if(response.chain.length > longestChain.length && this.isChainValid(response.chain)){
                console.log("found the longest chain at address>>", node);
                isReplaced = true;
                longestChain = response.chain;
            }
        }, this);

        computeLongestChain = await Promise.all(computeLongestChain);
        if(isReplaced){ // current chain has to be replaced
            this.chain = longestChain;
            return true;
        }else{
            console.log("current node only has longest chain");
            return false;
        }
    }

    broadcast = async(data, endpoint, filters={}) =>{
        let network = Array.from(this.nodes);
        let indexOfAddress = network.indexOf(this.currentAddress);
        network.splice(indexOfAddress, 1); // we dont want to call the endpoint for the same server, it will become infinte loop

        console.log("BROADCASTING---------------");
        console.log("network>>", network);
        let options = {
            method: filters.method || 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: data ? JSON.stringify(data) : null,
            redirect: "follow"
        }
        console.log("options>>>", options);
        network.forEach(async(node) =>{
            console.log('url>', `${node}/${endpoint}`);
            console.log()
            try{
                let response = await fetch(`${node}/${endpoint}`, options);
                console.log("response status from broadcasting>>", response.status);
            }catch(err){
                console.log("broadcast failed - maybe the other servers are not running, err>>", err);
                
            }
        })
    }

}

const blockchainSchema = new BlockchainSchema();

module.exports =  {
    blockchainSchema
}