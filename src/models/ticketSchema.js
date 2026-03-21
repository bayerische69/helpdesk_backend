import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema({
    adminID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: false
    },
    userID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    email: {
        type: String,
        required: true
    },
    priorityStatus: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Urgent'],
        required: true,
        default: 'Low'
    },
    division: {
        type: String,
        required: true,
        enum: ['PSD', 'ADMIN', 'SUPPLY', 'RECORDS', 'ARCHIVES']
    },
    category: {
        type: String,
        required: true,
        enum: ['Software Issue', 'Hardware Issue']
    },
    scheduleDateTime: {
        type: Date,
        required: true,
        default: Date.now()
    },
    description: {
        type: String,
        required: true
    }, 
    ticketStatus: {
        type: String,
        enum: ['Pending', 'In Progress', 'Closed - Referred to CMISID', 'Closed - Resolved'],
        required: false,
        default: 'Pending'
    }
}, { timestamps: true })

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket;