const crypto = require('crypto');

class BlockchainSchema{
    constructor(){
        this.length = 0;
        this.chain = [];
    }

    createBlock = (data) =>{
        const timeStamp = new Date();
        let block = {
            index: this.length+1,
            timestamp: timeStamp.getTime(),
            data: data,
            nonce: -1, //this gets computed below, now just initialized
            prevHash: this.getPrevHash(),
        }

        block.nonce = this.computeNonce(block);
        block.curHash = this.getCurrentHash(block);
        this.chain.push(block);
        this.length++;
        return block;
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


}

const blockchainSchema = new BlockchainSchema();

module.exports =  {
    blockchainSchema
}