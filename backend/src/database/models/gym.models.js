// All gym tables live in one file. Relations are declared in models/index.js with
// constraints:false, so table creation order never matters.
//
// NOTE: pk() and amount() are FUNCTIONS on purpose. Sequelize writes the column name
// into each attribute definition object, so one shared object reused for several
// attributes makes them all point to the same column.
module.exports = (sequelize, DataTypes) => {
    const { UUID, UUIDV4, STRING, TEXT, INTEGER, BOOLEAN, DECIMAL, DATEONLY, DATE, JSONB } = DataTypes;
    const pk = () => ({ type: UUID, defaultValue: UUIDV4, primaryKey: true });
    const amount = () => ({ type: DECIMAL(10, 2), allowNull: false, defaultValue: 0 });

    const GymSettings = sequelize.define("GymSettings", {
        venue_id: { type: UUID, primaryKey: true },
        receipt_prefix: { type: STRING(10), allowNull: false, defaultValue: "RCPT" },
        message_templates: { type: JSONB, allowNull: false, defaultValue: {} },
        razorpay_key_id: STRING,
        razorpay_key_secret_enc: TEXT
    }, { tableName: "gym_settings" });

    const GymPlan = sequelize.define("GymPlan", {
        id: pk(),
        venue_id: { type: UUID, allowNull: false },
        name: { type: STRING, allowNull: false },
        description: TEXT,
        duration_unit: { type: STRING(10), allowNull: false, defaultValue: "months" }, // months | days
        duration_value: { type: INTEGER, allowNull: false, defaultValue: 1 },
        price: amount(),
        discount_percent: { type: DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
        joining_fee: amount(),
        pt_addon_price: amount(),
        tax_rate: { type: DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
        freeze_allowed: { type: BOOLEAN, allowNull: false, defaultValue: true },
        max_freeze_days: { type: INTEGER, allowNull: false, defaultValue: 15 },
        is_popular: { type: BOOLEAN, allowNull: false, defaultValue: false },
        is_active: { type: BOOLEAN, allowNull: false, defaultValue: true },
        sort_order: { type: INTEGER, allowNull: false, defaultValue: 0 }
    }, { tableName: "gym_plans", indexes: [{ fields: ["venue_id"] }] });

    const GymMember = sequelize.define("GymMember", {
        id: pk(),
        venue_id: { type: UUID, allowNull: false },
        seq: { type: INTEGER, allowNull: false },
        member_code: { type: STRING(20), allowNull: false },
        name: { type: STRING, allowNull: false },
        phone: { type: STRING(10), allowNull: false },
        email: STRING,
        gender: STRING(10),
        dob: DATEONLY,
        photo_url: TEXT,
        goal: STRING(30),
        health_notes: TEXT,
        emergency_name: STRING,
        emergency_phone: STRING(15),
        trainer_name: STRING,
        source: STRING(30),
        notes: TEXT,
        // denormalised from the latest membership so lists/filters stay fast
        plan_id: UUID,
        plan_name: STRING,
        has_pt: { type: BOOLEAN, allowNull: false, defaultValue: false },
        start_date: DATEONLY,
        end_date: DATEONLY,
        joined_on: DATEONLY,
        status: { type: STRING(12), allowNull: false, defaultValue: "new" }, // new | active | frozen | expired | cancelled
        frozen_on: DATEONLY,
        freeze_until: DATEONLY,
        balance_due: amount(),
        total_paid: amount(),
        portal_token: { type: STRING(40), allowNull: false },
        is_archived: { type: BOOLEAN, allowNull: false, defaultValue: false }
    }, {
        tableName: "gym_members",
        indexes: [
            { fields: ["venue_id", "status"] },
            { fields: ["venue_id", "end_date"] },
            { unique: true, fields: ["venue_id", "seq"], name: "gym_members_venue_seq_uq" },
            { unique: true, fields: ["portal_token"], name: "gym_members_portal_token_uq" },
            { unique: true, fields: ["venue_id", "phone"], where: { is_archived: false }, name: "gym_members_venue_phone_active_uq" }
        ]
    });

    const GymMembership = sequelize.define("GymMembership", {
        id: pk(),
        venue_id: { type: UUID, allowNull: false },
        member_id: { type: UUID, allowNull: false },
        plan_id: UUID,
        plan_name: { type: STRING, allowNull: false },
        kind: { type: STRING(10), allowNull: false, defaultValue: "new" }, // new | renewal
        start_date: { type: DATEONLY, allowNull: false },
        end_date: { type: DATEONLY, allowNull: false },
        base_price: amount(),
        discount_amount: amount(),
        joining_fee: amount(),
        pt_amount: amount(),
        total_amount: amount(),
        amount_paid: amount(),
        tax_rate: { type: DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
        has_pt: { type: BOOLEAN, allowNull: false, defaultValue: false },
        freeze_days_used: { type: INTEGER, allowNull: false, defaultValue: 0 },
        status: { type: STRING(10), allowNull: false, defaultValue: "active" }, // active | cancelled
        notes: TEXT
    }, { tableName: "gym_memberships", indexes: [{ fields: ["member_id"] }, { fields: ["venue_id", "end_date"] }] });

    const GymPayment = sequelize.define("GymPayment", {
        id: pk(),
        venue_id: { type: UUID, allowNull: false },
        member_id: { type: UUID, allowNull: false },
        membership_id: UUID,
        amount: { type: DECIMAL(10, 2), allowNull: false },
        mode: { type: STRING(20), allowNull: false, defaultValue: "cash" },
        status: { type: STRING(12), allowNull: false, defaultValue: "paid" }, // paid | pending | expired | cancelled
        paid_on: DATEONLY,
        receipt_seq: INTEGER,
        receipt_no: STRING(30),
        reference: STRING,
        received_by: STRING,
        notes: TEXT,
        pay_token: STRING(40),
        rzp_link_id: STRING,
        rzp_link_url: TEXT,
        rzp_payment_id: STRING,
        meta: { type: JSONB, allowNull: false, defaultValue: {} },
        expires_at: DATE
    }, {
        tableName: "gym_payments",
        indexes: [
            { fields: ["venue_id", "member_id"] },
            { fields: ["venue_id", "status"] },
            { fields: ["membership_id"] },
            { unique: true, fields: ["pay_token"], name: "gym_payments_pay_token_uq" },
            { unique: true, fields: ["venue_id", "receipt_seq"], name: "gym_payments_receipt_uq" }
        ]
    });

    const GymExercise = sequelize.define("GymExercise", {
        id: pk(),
        venue_id: UUID, // NULL = built-in library
        name: { type: STRING, allowNull: false },
        body_part: { type: STRING(20), allowNull: false },
        equipment: STRING,
        instructions: TEXT,
        video_url: TEXT,
        is_active: { type: BOOLEAN, allowNull: false, defaultValue: true }
    }, { tableName: "gym_exercises", indexes: [{ fields: ["venue_id", "body_part"] }] });

    const GymWorkoutPlan = sequelize.define("GymWorkoutPlan", {
        id: pk(),
        venue_id: { type: UUID, allowNull: false },
        member_id: UUID,
        source_template_id: UUID,
        name: { type: STRING, allowNull: false },
        goal: STRING(30),
        level: STRING(15),
        duration_weeks: INTEGER,
        days: { type: JSONB, allowNull: false, defaultValue: [] },
        notes: TEXT,
        is_template: { type: BOOLEAN, allowNull: false, defaultValue: false },
        share_token: STRING(40),
        sent_at: DATE
    }, {
        tableName: "gym_workout_plans",
        indexes: [{ fields: ["venue_id", "is_template"] }, { fields: ["member_id"] }, { unique: true, fields: ["share_token"], name: "gym_workout_share_uq" }]
    });

    const GymLead = sequelize.define("GymLead", {
        id: pk(),
        venue_id: { type: UUID, allowNull: false },
        name: { type: STRING, allowNull: false },
        phone: { type: STRING(10), allowNull: false },
        goal: STRING(30),
        preferred_time: STRING(40),
        source: { type: STRING(20), allowNull: false, defaultValue: "website" },
        status: { type: STRING(15), allowNull: false, defaultValue: "new" },
        trial_date: DATEONLY,
        notes: TEXT,
        converted_member_id: UUID
    }, { tableName: "gym_leads", indexes: [{ fields: ["venue_id", "status"] }, { fields: ["venue_id", "phone"] }] });

    return { GymSettings, GymPlan, GymMember, GymMembership, GymPayment, GymExercise, GymWorkoutPlan, GymLead };

};