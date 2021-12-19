export class OpenIDDto {
    ns: string;
    mode: string;
    op_endpoint: string;
    claimed_id: string;
    identity: string;
    return_to: string; 
    response_nonce: string; // better type?
    assoc_handle: string;
    signed: string; // Comma seprated array
    sig: string;
}
