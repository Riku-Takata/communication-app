// client/src/models/Member.ts

import mongoose, { Document, Schema } from 'mongoose'

export interface IMember extends Document {
  name: string
  password: string
}

const MemberSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  password: { type: String, required: true },
})

export default mongoose.models.Member || mongoose.model<IMember>('Member', MemberSchema)
