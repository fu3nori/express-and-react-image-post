import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp()
const db = admin.firestore()

export const createArtwork = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Login required')
    }
    const uid = context.auth.uid
    const { title, description, imagePath } = data
    if (!title) throw new functions.https.HttpsError('invalid-argument', 'title is required')

    const now = admin.firestore.FieldValue.serverTimestamp()
    const ref = db.collection('artworks').doc()
    await ref.set({
        ownerId: uid,
        title,
        description: description ?? '',
        imagePath: imagePath ?? null,
        likes: 0,
        createdAt: now,
        updatedAt: now,
    })

    return { id: ref.id }
})
