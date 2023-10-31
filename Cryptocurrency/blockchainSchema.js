const crypto = require('crypto');


class BlockchainSchema{
    constructor(){
        this.length = 0;
        this.chain = [];
        this.transactions = [];//mempool -> all the transactions are first stored here before getting mined
        this.nodes = new Set()
    }

    createBlock = () =>{
        if(this.transactions.length === 1){ // only the miner reward present from the prev line
            this.transactions = [];
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

        this.transactions = [];
        block.nonce = this.computeNonce(block);
        block.curHash = this.getCurrentHash(block);
        this.chain.push(block);
        this.length++;
        if(this.replaceChain()){
            return {
                block: block,
                status: false
            };
        }else{
            return {
                block: block,
                status: true
            };
        }
    }

    addTransaction = ({sender, receiver, amount}) =>{
        let transaction = {
            sender: sender,
            receiver: receiver,
            amount: amount
        };

        this.transactions.push(transaction);
        console.log("transaction list>", this.transactions);
        return {
            transaction: transaction,
            index: this.chain.length + 1 // index of block that will receive the transaction
        };
    }

    addNode = async(addresses, currentAddress) =>{
        console.log("adding nodes>", addresses);
        
        let alreadyPresent = addresses.every(item => this.nodes.has(item));
        console.log("are the nodes aleady present????", alreadyPresent);
        
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
        await this.broadcast(dataToBroadcast, 'register', {currentAddress: currentAddress});
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
        let prevBlock = {};
        chain.map(block =>{
            //2 conditions -> if previous block hash equals previous hash key of current block. if current hash has 1 leading zero
            if(block.prevHash !== '0'){//genesis block this logic wont apply
                let prevBlockHashed = crypto.createHash('sha256').update(JSON.stringify(prevBlock)).digest('hex');
                if(block.prevHash !== prevBlockHashed){
                    return false;
                }
            }
            let curBlockHashed = crypto.createHash('sha256').update(JSON.stringify(block)).digest('hex');
            if(curBlockHashed.slice(0,1)!=='0'){
                return false;
            }
            prevBlock = block;
        })
    }

    replaceChain = async() =>{
        console.log("entered compute longest chain");
        let network = this.nodes;
        console.log("network>", network);
        let longestChain = [];
        network.forEach(async(node) =>{
            console.log("node>", node);
            let options = {
                method: 'GET'
            }
            let response = await fetch(`${node}/get_chain`, options);
            response = await response.json();

            if(response.chain.length > longestChain.length && this.isChainValid(response.chain)){
                longestChain = response.chain;
            }else{
                //the chain in the current node must be altered, see how to do
            }
        })
        if(longestChain[0]){ // current chain has to be replaced
            this.chain = longestChain;
            return true;
        }else{
            return false;
        }
    }

    broadcast = async(data, endpoint, filters={}) =>{
        let network = Array.from(this.nodes);
        let indexOfAddress = network.indexOf(filters.currentAddress);
        network.splice(indexOfAddress, 1); // we dont want to call the endpoint for the same server, it will become infinte loop

        console.log("data to broadcast>", data);

        console.log("BROADCASTING---------------");
        console.log("network>>", network);
        let options = {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data),
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