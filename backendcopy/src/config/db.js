const mongoose=require('mongoose');
async function main(){
    try{
        await mongoose.connect(process.env.DB_CONNECT_STRING);
        console.log("MongoDB connected");
    }catch(err){
        console.log(err);
        process.exit(1);
    }  
}

module.exports=main;