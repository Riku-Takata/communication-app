// client/src/models/Communication.ts

import mongoose, { Document, Schema } from 'mongoose'
import { IMember } from './Member'

export interface ICommunication extends Document {
  from: IMember['_id']
  to: IMember['_id']
  timestamp: Date
}

const CommunicationSchema: Schema = new Schema({
  from: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  to: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  timestamp: { type: Date, default: Date.now },
})

export default mongoose.models.Communication || mongoose.model<ICommunication>('Communication', CommunicationSchema)
