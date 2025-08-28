async function globalTeardown(config) {
  // Clean up test data
  // This could involve removing Firebase test data
  
  // Reset environment variables
  delete process.env.REACT_APP_TESTING;
  
  console.log('Global teardown completed');
}

export default globalTeardown;
