export const environment = {
  firebaseConfig: {
    apiKey: 'AIzaSyDtZY5kBVAv98zvI3psY3UnXVRT2nAGIIU',
    authDomain: 'worksync-3e7dd.firebaseapp.com',
    projectId: 'worksync-3e7dd',
    storageBucket: 'worksync-3e7dd.firebasestorage.app',
    messagingSenderId: '379045447630',
    appId: '1:379045447630:web:82fbd739179529153b0d9f',
    measurementId: 'G-XYZS6HYGDD',
  },
  googleConfig: {
    apiUrl: 'https://www.googleapis.com',
    clientId: '1098573225357-enm62hvibb30atj1vrjfmi39cv4phimv.apps.googleusercontent.com',
    clientSecret: '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',
    redirectUrl: 'http://localhost:4200',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/tasks',
    ].join(' '),
  },
};
