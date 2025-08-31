'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Enable UUID extension
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pg_trgm";');
    
    // Create ENUM types
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('user', 'admin', 'guest');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE library_status AS ENUM ('unread', 'reading', 'read', 'want_to_read');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create Users table
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      role: {
        type: 'user_role',
        defaultValue: 'user'
      },
      profile_picture_url: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      bio: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      email_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      last_login: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // Create Books table
    await queryInterface.createTable('books', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      author: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      isbn: {
        type: Sequelize.STRING(20),
        allowNull: true,
        unique: true
      },
      genre: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      published_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      book_cover_url: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      cuisine_type: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      dietary_category: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      difficulty_level: {
        type: 'difficulty_level',
        allowNull: true
      },
      ingredients: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      sample_recipes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      author_bio: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      visibility: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      average_rating: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0
      },
      rating_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      user_id: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // Create User Books table
    await queryInterface.createTable('user_books', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      book_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'books',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      status: {
        type: 'library_status',
        defaultValue: 'unread'
      },
      rating: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 5
        }
      },
      review: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      date_added: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      date_started: {
        type: Sequelize.DATE,
        allowNull: true
      },
      date_completed: {
        type: Sequelize.DATE,
        allowNull: true
      },
      is_favorite: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      progress: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100
        }
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // Create Categories table
    await queryInterface.createTable('categories', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      icon: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      color: {
        type: Sequelize.STRING(7),
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // Create unique constraint on user_books
    await queryInterface.addConstraint('user_books', {
      fields: ['user_id', 'book_id'],
      type: 'unique',
      name: 'unique_user_book'
    });

    // Create rating check constraint on user_books
    await queryInterface.sequelize.query(`
      ALTER TABLE user_books 
      ADD CONSTRAINT check_user_books_rating 
      CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));
    `);

    // Create progress check constraint on user_books
    await queryInterface.sequelize.query(`
      ALTER TABLE user_books 
      ADD CONSTRAINT check_user_books_progress 
      CHECK (progress >= 0 AND progress <= 100);
    `);
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order
    await queryInterface.dropTable('user_books');
    await queryInterface.dropTable('categories');
    await queryInterface.dropTable('books');
    await queryInterface.dropTable('users');
    
    // Drop ENUM types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS library_status;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS difficulty_level;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS user_role;');
  }
};