import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { MongoClient } from 'mongodb'

// Resolve absolute path to .env file in server directory
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env') })

const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// Initialize MongoDB Client
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/zippi'
const client = new MongoClient(mongoUri)

let db = null

async function connectDatabase() {
  try {
    console.log('Connecting to MongoDB...')
    await client.connect()
    db = client.db()
    console.log('✅ Connected successfully to MongoDB database.')
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message)
    console.error('👉 Ensure your local MongoDB server is active or check MONGO_URI in server/.env.')
  }
}

// ── GET Healthcheck ──
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    dbConnected: !!db,
    time: new Date().toISOString()
  })
})

// ── POST Sync Outbox Batch Operations ──
app.post('/api/ops', async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database connection is inactive. Check server logs.' })
  }

  const { ops } = req.body
  if (!ops || !Array.isArray(ops)) {
    return res.status(400).json({ error: 'Missing ops array in request body.' })
  }

  const processedOpIds = []
  console.log(`[Backend] Received sync batch of ${ops.length} operations.`)

  for (const op of ops) {
    const { opId, action } = op
    if (!opId || !action) continue

    try {
      // 1. Check idempotency: Has this opId already been processed?
      const alreadyProcessed = await db.collection('processed_ops').findOne({ _id: opId })
      if (alreadyProcessed) {
        console.log(`[Backend] Op ${opId} was already processed. Skipping.`)
        processedOpIds.push(opId)
        continue
      }

      console.log(`[Backend] Processing op ${opId}: ${action.type}`)

      // 2. Process action types
      switch (action.type) {
        case 'addItem':
        case 'updateItem': {
          const item = action.item
          await db.collection('items').updateOne(
            { _id: item.id },
            {
              $set: {
                name: item.name,
                category: item.category,
                pricePaise: parseInt(item.pricePaise),
                saleType: item.saleType,
                unit: item.unit,
                quantityMilli: parseInt(item.quantityMilli),
                lowStockAtMilli: parseInt(item.lowStockAtMilli),
                barcode: item.barcode,
                updatedAt: new Date()
              }
            },
            { upsert: true }
          )
          break
        }
        case 'deleteItem': {
          await db.collection('items').deleteOne({ _id: action.itemId })
          break
        }
        case 'restock': {
          await db.collection('items').updateOne(
            { _id: action.itemId },
            {
              $inc: { quantityMilli: parseInt(action.addMilli) },
              $set: { updatedAt: new Date() }
            }
          )
          break
        }
        case 'recordSale': {
          const sale = action.sale
          // 2a. Save sale with nested lines array
          await db.collection('sales').updateOne(
            { _id: sale.id },
            {
              $set: {
                ref: sale.ref,
                totalPaise: parseInt(sale.totalPaise),
                at: parseInt(sale.at),
                status: sale.status,
                customerCue: sale.customerCue,
                customerPhone: sale.customerPhone,
                pinned: !!sale.pinned,
                lines: sale.lines.map(l => ({
                  itemId: l.itemId,
                  name: l.name,
                  category: l.category,
                  pricePaise: parseInt(l.pricePaise),
                  qtyMilli: parseInt(l.qtyMilli),
                  unit: l.unit
                })),
                updatedAt: new Date()
              }
            },
            { upsert: true }
          )

          // 2b. Atomic stock decrement for sold items in MongoDB
          for (const line of sale.lines) {
            await db.collection('items').updateOne(
              { _id: line.itemId },
              {
                $inc: { quantityMilli: -parseInt(line.qtyMilli) },
                $set: { updatedAt: new Date() }
              }
            )
          }
          break
        }
        case 'settleSale': {
          await db.collection('sales').updateOne(
            { _id: action.saleId },
            {
              $set: {
                status: 'PAID',
                at: parseInt(action.at),
                pinned: false,
                updatedAt: new Date()
              }
            }
          )
          break
        }
        case 'voidSale': {
          // 1. Fetch sale to identify what item stocks need to be restored
          const sale = await db.collection('sales').findOne({ _id: action.saleId })
          if (sale && sale.lines) {
            for (const l of sale.lines) {
              await db.collection('items').updateOne(
                { _id: l.itemId },
                {
                  $inc: { quantityMilli: parseInt(l.qtyMilli) },
                  $set: { updatedAt: new Date() }
                }
              )
            }
          }

          // 2. Delete the sale document
          await db.collection('sales').deleteOne({ _id: action.saleId })
          break
        }
        case 'updateCue': {
          const updateFields = { updatedAt: new Date() }
          if (action.cue !== undefined) updateFields.customerCue = action.cue
          if (action.phone !== undefined) updateFields.customerPhone = action.phone

          await db.collection('sales').updateOne(
            { _id: action.saleId },
            { $set: updateFields }
          )
          break
        }
        case 'togglePin': {
          // Read current sale pin state and toggle it
          const sale = await db.collection('sales').findOne({ _id: action.saleId })
          if (sale) {
            await db.collection('sales').updateOne(
              { _id: action.saleId },
              {
                $set: {
                  pinned: !sale.pinned,
                  updatedAt: new Date()
                }
              }
            )
          }
          break
        }
        case 'updateShop': {
          await db.collection('shops').updateOne(
            { _id: action.shop.phone || 'demo' },
            {
              $set: {
                name: action.shop.name,
                ownerName: action.shop.ownerName,
                upiId: action.shop.upiId,
                updatedAt: new Date()
              }
            },
            { upsert: true }
          )
          break
        }
        default:
          console.warn(`[Backend] Skipping unknown action type: ${action.type}`)
          break
      }

      // 3. Insert opId into the processed_ops collection
      await db.collection('processed_ops').insertOne({
        _id: opId,
        processedAt: new Date()
      })

      console.log(`[Backend] Op ${opId} synced successfully.`)
      processedOpIds.push(opId)

    } catch (err) {
      console.error(`[Backend] Error syncing operation ${opId} (${action.type}):`, err.message || err)
      break // Halt queue loop on first failure to keep chronological logs
    }
  }

  res.json({ processedOpIds })
})

// ── POST Send SMS Endpoint ──
app.post('/api/send-sms', async (req, res) => {
  const { phone, billText } = req.body
  if (!phone || !billText) {
    return res.status(400).json({ error: 'Missing phone or billText.' })
  }

  console.log(`[SMS Gateway Mock] Sending bill receipt to +91${phone}:`)
  console.log(billText)
  console.log(`-----------------------------------------------`)

  res.json({ success: true, message: `Mock SMS dispatched to +91${phone}.` })
})

// Start server
app.listen(port, async () => {
  console.log(`🚀 Zippi REST API Sync Gateway listening on http://localhost:${port}`)
  console.log(`🔗 MongoDB Connection string: ${mongoUri}`)
  
  await connectDatabase()
})
