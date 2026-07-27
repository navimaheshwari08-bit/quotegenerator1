import mongoose from 'mongoose';

const diaryEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quote: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: String,
    default: 'Anonymous Mind'
  },
  moonPhase: {
    type: String,
    enum: ['full', 'crescent'],
    default: 'full'
  },
  category: {
    type: String,
    default: 'General'
  },
  movieTitle: {
    type: String,
    default: null
  },
  isMovieMode: {
    type: Boolean,
    default: false
  },
  userInput: {
    type: String,
    default: ''
  },
  note: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const DiaryEntry = mongoose.models.DiaryEntry || mongoose.model('DiaryEntry', diaryEntrySchema);
export default DiaryEntry;
