const admin = require('firebase-admin');
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://circle-7ebf2.firebaseio.com'
});

const auth = admin.auth();
const db = admin.firestore();

async function seedDatabase() {
  try {
    console.log('Starting database seed...');

    // Test users to create
    const users = [
      { email: 'demo@circleapp.com', password: 'CircleDemo2026', displayName: 'Christina' },
      { email: 'jess@test.com', password: 'password123', displayName: 'Jess' },
      { email: 'marcus@test.com', password: 'password123', displayName: 'Marcus' },
      { email: 'priya@test.com', password: 'password123', displayName: 'Priya' }
    ];

    const createdUsers = [];

    // Create auth accounts and Firestore docs
    for (const user of users) {
      try {
        const userRecord = await auth.createUser({
          email: user.email,
          password: user.password,
          displayName: user.displayName
        });
        console.log(`Created user: ${user.email}`);

        // Create Firestore user document
        await db.collection('users').doc(userRecord.uid).set({
          displayName: user.displayName,
          email: user.email,
          photoURL: '',
          blockedUsers: [],
          flagsMade: []
        });

        createdUsers.push({ uid: userRecord.uid, displayName: user.displayName, email: user.email });
      } catch (err) {
        console.log(`User ${user.email} may already exist: ${err.message}`);
      }
    }

    if (createdUsers.length === 0) {
      console.log('No new users created. Using existing users.');
      // Get existing users
      const demoSnap = await db.collection('users').where('email', '==', 'demo@circleapp.com').limit(1).get();
      const jessSnap = await db.collection('users').where('email', '==', 'jess@test.com').limit(1).get();
      const marcusSnap = await db.collection('users').where('email', '==', 'marcus@test.com').limit(1).get();
      const priyaSnap = await db.collection('users').where('email', '==', 'priya@test.com').limit(1).get();

      if (demoSnap.docs.length) createdUsers.push({ uid: demoSnap.docs[0].id, displayName: 'Christina' });
      if (jessSnap.docs.length) createdUsers.push({ uid: jessSnap.docs[0].id, displayName: 'Jess' });
      if (marcusSnap.docs.length) createdUsers.push({ uid: marcusSnap.docs[0].id, displayName: 'Marcus' });
      if (priyaSnap.docs.length) createdUsers.push({ uid: priyaSnap.docs[0].id, displayName: 'Priya' });
    }

    // Create circle
    const circleName = 'Demo Circle';
    const memberIds = createdUsers.map(u => u.uid);

    const circleRef = await db.collection('circles').add({
      name: circleName,
      code: 'XPK959',
      createdBy: createdUsers[0].uid,
      members: memberIds,
      memberProfiles: {},
      goal: null
    });

    console.log(`Created circle: ${circleName} with code XPK959`);

    // Add circle to all users
    for (const user of createdUsers) {
      await db.collection('users').doc(user.uid).update({
        circleId: circleRef.id
      });
    }

    // Create sample posts
    const photos = [
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80',
      'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&q=80'
    ];

    const today = new Date().toISOString().slice(0, 10);
    for (let i = 1; i < createdUsers.length; i++) {
      await db.collection('posts').add({
        circleId: circleRef.id,
        userId: createdUsers[i].uid,
        userName: createdUsers[i].displayName,
        photo: photos[i - 1],
        date: today,
        createdAt: new Date(),
        likes: [createdUsers[0].uid],
        comments: []
      });
    }

    console.log('✅ Seeding complete!');
    console.log(`Circle Code: XPK959`);
    console.log(`Demo Account: demo@circleapp.com / CircleDemo2026`);
    console.log(`Test Accounts: jess@test.com, marcus@test.com, priya@test.com / password123`);

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
