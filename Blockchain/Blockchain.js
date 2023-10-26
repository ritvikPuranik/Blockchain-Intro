const express = require('express');

let blockchain = require('./blockchainSchema').blockchainSchema;

const app = express();


app.get("/mine_block", async (req,res) =>{
    let block = blockchain.createBlock("this is data for block");
    if(block){
        let message = {
            status: true,
            block: block
        }  
        res.status(200).send(message);
    }else{
        res.status(500).send("internal server error");
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

app.listen(8080, (err)=>{
    if(err) console.log("error>", err);
    console.log("app listening on port 8080");
})