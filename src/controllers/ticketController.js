import Ticket from '../models/ticketSchema.js';
import transporter from '../config/nodemailer.js';


export async function getAllTickets(req, res) {
    try {
        const tickets = await Ticket.find().sort({ createdAt: -1 }).populate("userID", "fullName"); // newest first

        res.status(200).json(tickets);

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}

export async function getTicketsByID(req, res) {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate("userID", "fullName") 

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket Not Found",
      })
    }

    res.status(200).json(ticket)

  } catch (error) {
    console.error("Error tickets by id", error.message)
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    })
  }
}

export async function getTicketSchedules(req, res) {
  try {
    const schedules = await Ticket.find(
      {},
      "scheduleDateTime"
    ).sort({ createdAt: -1 });

    if (!schedules.length) {
      return res.status(404).json({ message: "No Tickets Found" });
    }

    res.status(200).json(schedules);
  } catch (error) {
    console.error("Error fetching ticket schedules:", error.message);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
}

export async function countTickets(req, res) {
  try {
    const stats = await Ticket.aggregate([
      {
        $group: {
          _id: "$ticketStatus",
          count: { $sum: 1 }
        }
      }
    ]);

    // base structure (prevents undefined)
    const result = {
      totalTickets: 0,
      pendingTickets: 0,
      inProgressTickets: 0,
      closedReferredTickets: 0,
      closedResolvedTickets: 0
    };

    stats.forEach(item => {
      result.totalTickets += item.count;

      switch (item._id) {
        case "Pending":
          result.pendingTickets = item.count;
          break;
        case "In Progress":
          result.inProgressTickets = item.count;
          break;
        case "Closed - Referred to CMISID":
          result.closedReferredTickets = item.count;
          break;
        case "Closed - Resolved":
          result.closedResolvedTickets = item.count;
          break;
        default:
          break;
      }
    });

    res.status(200).json(result);

  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message
    });
  }
}

export async function getTicketsByDateAndDivision(req, res) {
  try {
    const data = await Ticket.aggregate([
      {
        $addFields: {
          date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          }
        }
      },
      {
        $group: {
          _id: {
            date: "$date",
            division: "$division"
          },
          count: { $sum: 1 }
        }
      },
      {
        // group again by date
        $group: {
          _id: "$_id.date",
          divisions: {
            $push: {
              k: "$_id.division",
              v: "$count"
            }
          }
        }
      },
      {
        $addFields: {
          divisions: {
            $arrayToObject: "$divisions"
          }
        }
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          PSD: { $ifNull: ["$divisions.PSD", 0] },
          ADMIN: { $ifNull: ["$divisions.ADMIN", 0] },
          SUPPLY: { $ifNull: ["$divisions.SUPPLY", 0] },
          RECORDS: { $ifNull: ["$divisions.RECORDS", 0] },
          ARCHIVES: { $ifNull: ["$divisions.ARCHIVES", 0] }
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message
    });
  }
}


// export async function createTicket(req, res) {
//     const { userID, email, priorityStatus, division, category, scheduleDateTime, description } = req.body

//     if (!userID || !email || !division || !category || !scheduleDateTime || !description) {
//         return res.status(400).json({ message: "All fields are required" });
//     }

//     const scheduledDate = new Date(scheduleDateTime);
//     const now = new Date();

//     // 🔴 Invalid date check
//     if (isNaN(scheduledDate.getTime())) {
//         return res.status(400).json({ message: "Invalid schedule date format" });
//     }

//     // 🔴 Past date check
//     if (scheduledDate <= now) {
//         return res.status(400).json({
//             message: "Schedule date and time must be in the future"
//         });
//     }


//     try {

//         const newTicket = new Ticket({
//             userID,
//             email,
//             priorityStatus,
//             division,
//             category,
//             scheduleDateTime,
//             description
//         })

//         await newTicket.save();

//         res.status(201).json({
//             message: "Ticket Created Successfully",
//             data: newTicket
//         });

//         // Send email notification to user
//         const mailOptions = {
//             from: process.env.EMAIL_USER,
//             to: email,
//             subject: 'Ticket Created Successfully',
//             text: `Your ticket with ID ${newTicket._id} has been created successfully. We will get back to you shortly.`
//         }

//         // Send email notification to admin
//         const mailOptions2 = {
//             from: process.env.EMAIL_USER,
//             to: process.env.EMAIL_USER,
//             subject: 'New Ticket Created',
//             text: `A new ticket with ID ${newTicket._id} has been created by user with email ${email}. Please check the admin panel for more details.`
//         }

//         await transporter.sendMail(mailOptions);
//         await transporter.sendMail(mailOptions2);

//     } catch (error) {
//         console.error("Error creating ticket: ", error);
//     }
// }

export async function createTicket(req, res) {
    const { userID, email, priorityStatus, division, category, scheduleDateTime, description } = req.body;

    if (!userID || !email || !division || !category || !scheduleDateTime || !description) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const scheduledDate = new Date(scheduleDateTime);
    const now = new Date();

    if (isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ message: "Invalid schedule date format" });
    }

    if (scheduledDate <= now) {
        return res.status(400).json({
            message: "Schedule date and time must be in the future"
        });
    }

    try {
        // 🔴 Check if slot already booked
        const existingSchedule = await Ticket.findOne({
            scheduleDateTime: scheduledDate
        });

        if (existingSchedule) {

            // Get all future booked times
            const booked = await Ticket.find({
                scheduleDateTime: { $gte: now }
            }).select("scheduleDateTime");

            const bookedTimes = booked.map(t =>
                new Date(t.scheduleDateTime).getTime()
            );

            // ✅ Generate next available 15-min slots
            const availableSlots = [];
            let start = new Date();

            // Round to nearest 15 mins
            const minutes = start.getMinutes();
            const rounded = Math.ceil(minutes / 15) * 15;
            start.setMinutes(rounded, 0, 0);

            for (let i = 0; i < 100; i++) {
                const time = start.getTime();

                if (!bookedTimes.includes(time) && time > now.getTime()) {
                    availableSlots.push(new Date(time));
                }

                if (availableSlots.length === 5) break;

                // move forward 15 minutes
                start.setMinutes(start.getMinutes() + 15);
            }

            return res.status(409).json({
                message: "Selected schedule date and time is already taken.",
                available: false,
                nextAvailableSchedules: availableSlots
            });
        }

        // ✅ Create ticket if slot is free
        const newTicket = new Ticket({
            userID,
            email,
            priorityStatus,
            division,
            category,
            scheduleDateTime: scheduledDate,
            description
        });

        await newTicket.save();

        res.status(201).json({
            message: "Ticket Created Successfully",
            data: newTicket,
            available: true
        });

        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Ticket Created',
          html: `
          <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 40px 0;">
            <div style="max-width: 500px; margin: auto; background: #ffffff; padding: 30px; border-radius: 8px; text-align: center;">

              <h2 style="margin-bottom: 10px; color: #222;">Ticket Created</h2>
              
              <p style="color: #555; font-size: 14px; margin-bottom: 25px;">
                Your request has been received.
              </p>

              <div style="font-size: 18px; font-weight: bold; color: #000; margin-bottom: 25px;">
                #${newTicket._id}
              </div>

              <p style="color: #777; font-size: 13px;">
                We’ll get back to you shortly.
              </p>

            </div>
          </div>
          `
        };

        const mailOptions2 = {
          from: process.env.EMAIL_USER,
          to: process.env.EMAIL_USER,
          subject: 'New Ticket Created',
          html: `
          <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 40px 0;">
            <div style="max-width: 520px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden;">

              <!-- Top Accent -->
              <div style="height: 4px; background: #000;"></div>

              <div style="padding: 30px;">
                
                <h2 style="margin-bottom: 20px; color: #222;">New Ticket</h2>

                <p style="color: #555; font-size: 14px; margin-bottom: 20px;">
                  A new support ticket has been submitted.
                </p>

                <!-- Info Block -->
                <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; font-size: 14px; color: #333;">
                  <p style="margin: 0 0 8px;"><strong>Ticket ID:</strong> ${newTicket._id}</p>
                  <p style="margin: 0;"><strong>User Email:</strong> ${email}</p>
                </div>

                <p style="color: #777; font-size: 13px; margin-top: 25px;">
                  Check the admin panel for full details.
                </p>

              </div>
            </div>
          </div>
          `
        };
        await transporter.sendMail(mailOptions);
        await transporter.sendMail(mailOptions2);

    } catch (error) {
        console.error("Error creating ticket:", error);
        res.status(500).json({ message: "Server Error" });
    }
}


export async function updateTicketStatus(req, res) {
    const { ticketStatus } = req.body;

    try {

        const updateTicket = await Ticket.findByIdAndUpdate(
            req.params.id,
            { ticketStatus },
            { new: true }
        );

        if (!updateTicket) {
            return res.status(404).json({ message: "Ticket Not Found" });
        }

        res.status(200).json({
            message: "Ticket Status Updated Successfully",
            data: updateTicket
        })

    } catch (error) {
        console.error("Error updating ticket status: ", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function updateTicket(req, res) {
  try {
    const updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedTicket) {
      return res.status(404).json({ message: "Ticket Not Found" });
    }
    res.status(200).json({
      message: "Ticket Updated Successfully",
      data: updatedTicket
    });
  } catch (error) {
    console.error("Error updating ticket: ", error);
    res.status(500).json({ message: "Internal Server Error" });
    
  }
}

export async function deleteTicket(req, res) {
    try {
        const deleteTicket = await Ticket.findByIdAndDelete(req.params.id);

        if (!deleteTicket) return res.status(404).json({ message: "Ticket Not Found" });

        res.status(200).json({
            message: "User Deleted Successfully",
        });

    } catch (error) {
        console.log("Error deleting ticket: ", error);
        res.status(500).json({
            message: "Internal Server Error",
        })
    }
}