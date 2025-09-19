const mongoose = require('mongoose');
const Patient = require('../models/Patient');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/radiology_db', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const seedPatients = async () => {
    try {
        // Clear existing patients
        await Patient.deleteMany({});
        console.log('🗑️ Cleared existing patients');

        // Add the 2 real patients from Python backend
        const patients = [
            {
                patient_id: 'PAT_VIKASH_7F64CCAA',
                first_name: 'Vikash',
                last_name: '',
                middle_name: '',
                date_of_birth: '1990-01-01',
                gender: 'M',
                phone: '555-1001',
                email: 'vikash@example.com',
                address: '123 Vikash Street',
                city: 'Delhi',
                state: 'Delhi',
                zip_code: '110001',
                medical_record_number: 'MRN_VIKASH_001',
                active: true,
                created_at: new Date('2025-09-18T14:58:49')
            },
            {
                patient_id: 'PAT_PALAK_57F5AE30',
                first_name: 'Palak',
                last_name: '',
                middle_name: '',
                date_of_birth: '1992-05-15',
                gender: 'F',
                phone: '555-1002',
                email: 'palak@example.com',
                address: '456 Palak Avenue',
                city: 'Mumbai',
                state: 'Maharashtra',
                zip_code: '400001',
                medical_record_number: 'MRN_PALAK_001',
                active: true,
                created_at: new Date('2025-09-18T14:58:49')
            }
        ];

        // Insert patients
        const insertedPatients = await Patient.insertMany(patients);
        console.log('✅ Successfully added patients:');
        insertedPatients.forEach(patient => {
            console.log(`   👤 ${patient.first_name} (${patient.patient_id})`);
        });

        console.log(`\n🎉 Database seeded with ${insertedPatients.length} patients`);
        
    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        mongoose.connection.close();
    }
};

// Run the seeding
seedPatients();