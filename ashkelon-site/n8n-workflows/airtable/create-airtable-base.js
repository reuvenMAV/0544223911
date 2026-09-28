// create-airtable-base.js - Run with: node create-airtable-base.js pat_xxx app_xxx
// If you have credential ID, you can also run inside n8n Code node with $credentials

const AIRTABLE_PAT = process.argv[2] || process.env.AIRTABLE_PAT;
const BASE_ID = process.argv[3] || process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_PAT) {
  console.log("Usage: AIRTABLE_PAT=patXXX node create-airtable-base.js");
  console.log("OR: node create-airtable-base.js patXXX appXXX");
  process.exit(1);
}

async function createTables() {
  // Airtable doesn't allow creating base via API, only tables in existing base
  // So first create base manually in UI named 'Ashkelon Sea View', then run this to create tables
  
  const tables = [
    {
      name: "🏠 Properties",
      fields: [
        {name: "Name", type: "singleLineText"},
        {name: "Address", type: "singleLineText"},
        {name: "Max Guests", type: "number", options: {precision: 0}},
        {name: "Base Price", type: "currency", options: {precision: 0, symbol: "₪"}},
        {name: "Weekend Price", type: "currency", options: {precision: 0, symbol: "₪"}},
        {name: "Cleaning Fee", type: "currency", options: {precision: 0, symbol: "₪"}},
        {name: "Status", type: "singleSelect", options: {choices: [{name:"Active"},{name:"Blocked"}]}}
      ]
    },
    {
      name: "📅 Bookings",
      fields: [
        {name: "Booking ID", type: "singleLineText"},
        {name: "Guest Name", type: "singleLineText"},
        {name: "Phone", type: "phoneNumber"},
        {name: "Email", type: "email"},
        {name: "Checkin", type: "date", options: {dateFormat: {name:"iso"}}},
        {name: "Checkout", type: "date"},
        {name: "Nights", type: "number"},
        {name: "Guests", type: "number"},
        {name: "Total ₪", type: "currency", options: {symbol:"₪"}},
        {name: "Status", type: "singleSelect", options: {choices: [{name:"Pending"},{name:"Paid"},{name:"Cancelled"}]}},
        {name: "Source", type: "singleSelect", options: {choices: [{name:"direct_website"},{name:"airbnb"},{name:"booking.com"}]}},
        {name: "Wallet Token", type: "singleLineText"},
        {name: "PayPlus Transaction", type: "singleLineText"}
      ]
    },
    {
      name: "🚫 Blocked Dates",
      fields: [
        {name: "Date", type: "date"},
        {name: "Source", type: "singleLineText"},
        {name: "Reason", type: "singleLineText"}
      ]
    },
    {
      name: "👥 Guests CRM",
      fields: [
        {name: "Phone", type: "phoneNumber"},
        {name: "Name", type: "singleLineText"},
        {name: "Total Stays", type: "number"},
        {name: "VIP?", type: "checkbox"},
        {name: "Tags", type: "multipleSelect", options: {choices: [{name:"vip"},{name:"repeat"},{name:"dati"}]}}
      ]
    },
    {
      name: "🧹 Cleaning",
      fields: [
        {name: "Booking", type: "singleLineText"},
        {name: "Checkout Date", type: "date"},
        {name: "Status", type: "singleSelect", options: {choices: [{name:"To Clean"},{name:"In Progress"},{name:"Done"},{name:"Photo OK"}]}},
        {name: "Cleaner", type: "singleLineText"},
        {name: "Telegram Sent?", type: "checkbox"}
      ]
    },
    {
      name: "💵 Pricing Rules",
      fields: [
        {name: "Type", type: "singleSelect", options: {choices: [{name:"weekend"},{name:"holiday"},{name:"manual"}]}},
        {name: "Start Date", type: "date"},
        {name: "End Date", type: "date"},
        {name: "Price ₪", type: "currency", options: {symbol:"₪"}},
        {name: "Active?", type: "checkbox"}
      ]
    }
  ];

  if (!BASE_ID) {
    console.log("Base ID not provided - create base manuallly in UI first named 'Ashkelon Sea View', then run with Base ID");
    console.log("Tables to create manually:", tables.map(t=>t.name).join(", "));
    return;
  }

  for (const table of tables) {
    const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${AIRTABLE_PAT}`, "Content-Type": "application/json" },
      body: JSON.stringify(table)
    });
    const data = await res.json();
    console.log(`Created ${table.name}:`, res.status, data.id || data.error);
  }
}

createTables();
