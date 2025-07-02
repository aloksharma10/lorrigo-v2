3 type :

1.

credit note, debit note (sync with zoho)

1. 0.5 ( applicable )
2. 1.5 ( courier ) ------------------> ( 1 kg excess )

dispute schema:
applicable_weight Float? // 0.5
courier_weight Float? // 1.5
excess_weight Float? // 1
dispute_weight Float? // 1.5 // optional depend on seller input, never consider for calculation only to display to the admin what seller agree to accept dispute
final_total_weight Float? // 1
