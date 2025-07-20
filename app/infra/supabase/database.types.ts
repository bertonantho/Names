const isProduction = import.meta.env.PROD;
const environment = import.meta.env.MODE;

if (isProduction) {
  console.log('Running in production!');
} else {
  console.log('Running in development');
}
