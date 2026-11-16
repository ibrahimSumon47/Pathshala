import mongoose, { type Model, type Types } from 'mongoose';
const { model, models, Schema } = mongoose;

export type AttendanceDoc = {
  session: Types.ObjectId;
  course: Types.ObjectId;
  student: Types.ObjectId;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const attendanceSchema = new Schema<AttendanceDoc>(
  {
    session: { type: Schema.Types.ObjectId, ref: 'LiveSession', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

attendanceSchema.index({ session: 1, student: 1 }, { unique: true });
attendanceSchema.index({ course: 1, student: 1 });
export const Attendance =
  (models.Attendance as Model<AttendanceDoc> | undefined) ?? model<AttendanceDoc>('Attendance', attendanceSchema);
