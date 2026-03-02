"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import postgres from "postgres";
import { redirect } from "next/navigation";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(["pending", "paid"]),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export const createInvoice = async (formData: FormData) => {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  if (!customerId || !amount || !status) {
    throw new Error("Missing information");
  }

  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];

  try {
    await sql`
	        INSERT INTO invoices (customer_id, amount, status, date)
	        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
	    `;
  } catch (error) {
    console.error(error);
    return {
      message: "Database Error: Failed to create invoice",
    };
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
};

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export const updateInvoice = async (id: string, formData: FormData) => {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  if (!customerId || !amount || !status) {
    throw new Error("Missing information");
  }

  const amountInCents = amount * 100;

  try {
    await sql`
	        UPDATE invoices
	        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
	        WHERE id = ${id}
	    `;
  } catch (error) {
    console.error(error);
    return {
      message: "Database error: Failed to update invoice",
    };
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
};

export const deleteInvoice = async (id: string) => {
  if (!id) {
    throw new Error("Missing information");
  }

  try {
    await sql`
	        DELETE FROM invoices WHERE id = ${id}
	    `;
  } catch (error) {
    console.error(error);
    return {
      message: "Database error: Failed to delete invoice",
    };
  }

  revalidatePath("/dashboard/invoices");
};
