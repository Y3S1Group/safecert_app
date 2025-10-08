import { db } from "@/config/firebaseConfig";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export async function sendNotification(
    userId: string,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
) {
    try {
        console.log('sendNotification called with:', { userId, title, message, type })
        
        const docRef = await addDoc(collection(db, 'notifications'), {
            userId,
            title,
            message,
            type,
            read: false,
            createdAt: serverTimestamp()
        })
        
        console.log('Notification created with ID:', docRef.id)
    } catch (error) {
        console.error('Error sending notification:', error)
    }
}