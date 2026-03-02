const cron = require('node-cron');
const Complaint = require('./models/complaint');

// Run every day at midnight to update time left
cron.schedule('0 0 * * *', async () => {
    try {
        console.log('🕒 Updating time left for all complaints...');
        await Complaint.updateAllTimeLeft();
        console.log('✅ Time left updated successfully');
    } catch (error) {
        console.error('❌ Error updating time left:', error);
    }
});

module.exports = cron;