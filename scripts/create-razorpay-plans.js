const Razorpay = require('razorpay');
const fs = require('fs');

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error("Missing Keys");
    process.exit(1);
}

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function createPlans() {
    try {
        const proPlan = await razorpay.plans.create({
            period: "monthly",
            interval: 1,
            item: {
                name: "Pro Health Plan (INR 349)",
                amount: 34900,
                currency: "INR",
                description: "Unlimited AI Reports"
            }
        });

        const familyPlan = await razorpay.plans.create({
            period: "monthly",
            interval: 1,
            item: {
                name: "Family Health Plan (INR 849)",
                amount: 84900,
                currency: "INR",
                description: "5 Members"
            }
        });

        const output = `PRO_PLAN_ID=${proPlan.id}\nFAMILY_PLAN_ID=${familyPlan.id}`;
        fs.writeFileSync('razorpay_output.txt', output);
        console.log("Plans created and saved to razorpay_output.txt");

    } catch (error) {
        console.error("Error:", error);
        fs.writeFileSync('razorpay_output.txt', "ERROR: " + JSON.stringify(error));
    }
}

createPlans();
