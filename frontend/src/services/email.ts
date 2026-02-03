import { collection, addDoc } from "firebase/firestore/lite";
import { db } from "./firebase";

/**
 * AgriSaarthi Email Service
 * Uses the Firebase 'Trigger Email' extension pattern.
 * Adding a document to the 'mail' collection triggers an email.
 */
export const sendEmail = async (to: string, subject: string, htmlBody: string) => {
  try {
    const mailCollection = collection(db, 'mail');
    
    const docRef = await addDoc(mailCollection, {
      to: to,
      message: {
        subject: subject,
        html: htmlBody,
      },
    });

    console.log("[EmailService] Email document added with ID:", docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("[EmailService] Error adding email document:", error);
    throw error;
  }
};

/**
 * Example Usage:
 * sendEmail('farmer@example.com', 'AgriSaarthi Alert', '<h1>Crop Health Alert</h1><p>Action required for your Tomato crop.</p>');
 */
