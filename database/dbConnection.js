import mongoose from "mongoose";

const dbConnection = ()=>{
    mongoose.connect(process.env.MONGO_URI,{
        dbName: "portfolio"
    }).then(()=>{
        console.log("Database connected");
    }).catch((error)=>{
        console.log(`Some Error connect to database:${error}`);
        
    })
}

export default dbConnection;