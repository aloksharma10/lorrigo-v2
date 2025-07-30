export default function RefundPolicy() {
    return (
        <div className="mx-auto p-6">

            <ul className="my-4">
                <li>Company Name: Diaforaison Services Pvt Limited</li>
                <li>Official Email: logistics@lorrigo.com</li>
            </ul>

            <div className="mb-8">
                <h3 className="text-lg font-semibold mb-2">Refund Eligibility</h3>
                <p className="mb-2">Diaforaison Services Pvt Limited offers refunds under the following conditions</p>
                <p>Refunds are processed only if there is a positive balance in the customer&apos;s wallet.</p>
                <p>Refunds are issued if the customer&apos;s account is closed and all outstanding bills or charges have been settled.</p>
            </div>
            <div className="mb-8">
                <h3 className="text-lg font-semibold mb-2">Refund Process</h3>
                <p>To request a refund, customers must contact us at logistics@lorrigo.com.</p>
                <p>Customers must provide their account details and a brief explanation of the refund request.</p>
                <p>We will review the request and verify the eligibility criteria. If eligible, refunds will be processed within 5-7 business days via the original payment method used.</p>
            </div>
            <div className="mb-8">
                <h3 className="text-lg font-semibold mb-2">Non-Refundable Items</h3>
                <p>Service fees, transaction charges, or processing fees incurred during transactions are non-refundable.</p>
                <p>Any charges related to ongoing services or subscriptions are non-refundable.</p>
            </div>
            <div className="mb-8">
                <h3 className="text-lg font-semibold mb-2">Contact Information</h3>
                <p>If you have any questions or concerns regarding refunds, please contact us at:</p>
                <ul>
                    <li>Email: logistics@lorrigo.com</li>
                    {/* <li>Phone: [Phone Number]</li>
                    <li>Address: [Company Address]</li> */}
                </ul>
            </div>
            <div>
                <h3 className="text-lg font-semibold mb-2">Policy Changes</h3>
                <p>We reserve the right to modify or amend this refund policy at any time. Customers will be notified of any changes via email or through our website.</p>
            </div>
        </div>
    )
}