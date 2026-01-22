export interface Teacher {
  id: string;
  especialidad: string;
}

export interface Lead {
  id: string;
  date: string;
  companyName: string;
  sector: string;
  department: string;
  challenge: string;
  syllabus: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

export enum Sender {
  BOT = 'bot',
  USER = 'user'
}

export interface ChatMessage {
  id: string;
  sender: Sender;
  text: string;
  type?: 'text' | 'syllabus-action' | 'restart-action' | 'options';
  options?: string[]; // For "Ver ejemplo" etc
  syllabusContent?: string;
  matchedTeacherId?: string;
}

export interface ChatState {
  step: 'INIT' | 'COMPANY_NAME' | 'SECTOR_CONFIRM' | 'SECTOR_MANUAL' | 'DEP_CHALLENGE' | 'SYLLABUS_OFFER' | 'CONTACT_INFO' | 'COMPLETED';
  companyName: string;
  sector: string;
  department: string;
  challenge: string;
  generatedSyllabus: string;
}