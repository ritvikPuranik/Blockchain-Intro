const express = require('express');
const uuid = require('uuid');

let blockchain = require('./blockchainSchema').blockchainSchema;

const app = express();
app.use(express.json());

let nodeAddress = uuid.v4().replaceAll('-',''); // address of node on PORT

const PORT = 8001;

app.get("/mine_block", async (req,res) =>{
    let minerReward = {
        sender: nodeAddress,
        receiver: 'Ritvik',
        amount: 10
    }
    minerReward = blockchain.addTransaction(minerReward);
    let response = blockchain.createBlock();
    if(response){
        if(response.status){
            res.status(200).send(response);

        }else{
            res.status(200).send("Block not part of longest chain -> Rejected");
        }
    }else{
        res.status(500).send("There is nothing to mine, please add more transactions!");
    }
})

app.get("/get_chain", (req, res) =>{
    let chain = blockchain.getChain();
    if(chain){
        res.status(200).send({"chain": chain});
    }else{
        res.status(500).send("internal server error");
    }
})

app.post("/register", (req, res)=>{
    let addresses = req.body.addresses;
    if(!addresses){
        res.status(401).send("some data is missing, please check again");
    }
    let {address, port} = server.address();
    let currentAddress = `http://${address}:${port}`;
    console.log("Current address>>", currentAddress);
    blockchain.addNode(addresses, currentAddress);
    res.status(201).send("thank you for registering!");
})

app.post("/add_transaction", (req, res) =>{
    let keys = Object.keys(req.body);
    let reqdKeys = ['sender','receiver','amount'];
    let invalidRequest = false;
    reqdKeys.map(key=>{
        if(!keys.includes(key)){
            res.status(401).send("some fields are missing"); 
            invalidRequest = true;
            return; 
        }
    })
    if(invalidRequest) return;

    let {sender, receiver, amount} = req.body;
    if(amount <= 0){
        res.status(401).send("can only send values above 0");
    }
    let transaction = blockchain.addTransaction(req.body);
    res.status(201).send(transaction);
    
})

const server = app.listen(PORT, '127.0.0.1', (err)=>{
    if(err) console.log("error>", err);
    console.log("app listening on port "+ PORT);
})