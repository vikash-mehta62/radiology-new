const mongoose = require('mongoose');

// MongoDB connection configuration
class Database {
    constructor() {
        this.mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/radiology_db';
        this.options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        };
    }

    async connect() {
        try {
            console.log('🔄 Connecting to MongoDB...');
            console.log(`📍 MongoDB URI: ${this.mongoURI}`);
            
            await mongoose.connect(this.mongoURI, this.options);
            
            console.log('✅ MongoDB connected successfully');
            console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
            
            // Handle connection events
            this.setupEventListeners();
            
            return mongoose.connection;
        } catch (error) {
            console.error('❌ MongoDB connection error:', error.message);
            
            // If local MongoDB is not available, provide helpful message
            if (error.message.includes('ECONNREFUSED')) {
                console.log('\n💡 MongoDB Connection Tips:');
                console.log('1. Make sure MongoDB is installed and running');
                console.log('2. Start MongoDB service: mongod');
                console.log('3. Or use MongoDB Atlas cloud database');
                console.log('4. Update MONGODB_URI in .env file if needed\n');
            }
            
            throw error;
        }
    }

    setupEventListeners() {
        const connection = mongoose.connection;

        connection.on('connected', () => {
            console.log('🔗 Mongoose connected to MongoDB');
        });

        connection.on('error', (err) => {
            console.error('❌ Mongoose connection error:', err);
        });

        connection.on('disconnected', () => {
            console.log('🔌 Mongoose disconnected from MongoDB');
        });

        // Handle application termination
        process.on('SIGINT', async () => {
            try {
                await connection.close();
                console.log('🛑 MongoDB connection closed through app termination');
                process.exit(0);
            } catch (error) {
                console.error('Error closing MongoDB connection:', error);
                process.exit(1);
            }
        });
    }

    async disconnect() {
        try {
            await mongoose.connection.close();
            console.log('🔌 MongoDB disconnected successfully');
        } catch (error) {
            console.error('❌ Error disconnecting from MongoDB:', error);
            throw error;
        }
    }

    getConnectionStatus() {
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        
        return {
            status: states[mongoose.connection.readyState],
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            name: mongoose.connection.name
        };
    }

    async healthCheck() {
        try {
            const status = this.getConnectionStatus();
            
            if (status.status === 'connected') {
                // Test database operation
                await mongoose.connection.db.admin().ping();
                return {
                    status: 'healthy',
                    database: status,
                    timestamp: new Date().toISOString()
                };
            } else {
                return {
                    status: 'unhealthy',
                    database: status,
                    timestamp: new Date().toISOString()
                };
            }
        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Create singleton instance
const database = new Database();

module.exports = database;