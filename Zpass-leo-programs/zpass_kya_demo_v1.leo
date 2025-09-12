program zpass_kya_demo_v1.aleo {

    @noupgrade
    async constructor() {}

    // Admin who can manage the whitelist and KYA hashes.
    const ADMINISTRATOR: address = aleo13gm8vlqnk9qgaxvxn0y4z8u6pkpt7y4m0lp2270fvf5l4ewy65qsvpgx6x;

    // The mapping stores the hashes of the whitelisted addresses (keyed by BHP256(address) -> bool).
    mapping whitelisted: field => bool;

    // The mapping stores the KYA hash per address (keyed by BHP256(address) -> kya_hash field).
    mapping kya_hashes: field => field;

    //
    // --- Whitelist only ---
    //

    async transition add_address(user: address) -> Future {
        let caller: address = self.caller;
        return finalize_add_address(caller, BHP256::hash_to_field(user));
    }

    async function finalize_add_address(caller: address, user_key: field) {
        assert_eq(caller, ADMINISTRATOR);
        whitelisted.set(user_key, true);
    }

    async transition remove_address(user: address) -> Future {
        let caller: address = self.caller;
        return finalize_remove_address(caller, BHP256::hash_to_field(user));
    }

    async function finalize_remove_address(caller: address, user_key: field) {
        assert_eq(caller, ADMINISTRATOR);
        whitelisted.remove(user_key);
    }

    // External programs can call this to assert the signer is whitelisted.
    async transition check_address() -> Future {
        return finalize_check_address(self.signer);
    }

    async function finalize_check_address(user: address) {
        let user_key: field = BHP256::hash_to_field(user);
        let user_bool: bool = whitelisted.get_or_use(user_key, false);
        assert_eq(user_bool, true);
    }

    //
    // --- KYA only ---
    //

    // Set/overwrite only the KYA hash for a user (admin only).
    async transition set_kya(user: address, kya_hash: field) -> Future {
        let caller: address = self.caller;
        return finalize_set_kya(caller, BHP256::hash_to_field(user), kya_hash);
    }

    async function finalize_set_kya(caller: address, user_key: field, kya_hash: field) {
        assert_eq(caller, ADMINISTRATOR);
        kya_hashes.set(user_key, kya_hash);
    }

    // Remove a user's KYA entry (admin only).
    async transition remove_kya(user: address) -> Future {
        let caller: address = self.caller;
        return finalize_remove_kya(caller, BHP256::hash_to_field(user));
    }

    async function finalize_remove_kya(caller: address, user_key: field) {
        assert_eq(caller, ADMINISTRATOR);
        kya_hashes.remove(user_key);
    }

    // External programs can call this to assert the signer has the provided KYA hash.
    async transition check_kya(expected_kya_hash: field) -> Future {
        return finalize_check_kya(self.signer, expected_kya_hash);
    }

    async function finalize_check_kya(user: address, expected_kya_hash: field) {
        let user_key: field = BHP256::hash_to_field(user);
        // Default 0field if missing; equality check will fail unless expected is also 0.
        let stored_hash: field = kya_hashes.get_or_use(user_key, 0field);
        assert_eq(stored_hash, expected_kya_hash);
    }

    //
    // --- Combined: whitelist + KYA ---
    //

    // Add to whitelist AND set KYA hash in one call (admin only).
    async transition add_address_and_kya(user: address, kya_hash: field) -> Future {
        let caller: address = self.caller;
        return finalize_add_address_and_kya(caller, BHP256::hash_to_field(user), kya_hash);
    }

    async function finalize_add_address_and_kya(caller: address, user_key: field, kya_hash: field) {
        assert_eq(caller, ADMINISTRATOR);
        whitelisted.set(user_key, true);
        kya_hashes.set(user_key, kya_hash);
    }

    // External programs can call this to assert both: signer is whitelisted AND has the provided KYA hash.
    async transition check_address_and_kya(expected_kya_hash: field) -> Future {
        return finalize_check_address_and_kya(self.signer, expected_kya_hash);
    }

    async function finalize_check_address_and_kya(user: address, expected_kya_hash: field) {
        let user_key: field = BHP256::hash_to_field(user);

        let is_whitelisted: bool = whitelisted.get_or_use(user_key, false);
        assert_eq(is_whitelisted, true);

        let stored_hash: field = kya_hashes.get_or_use(user_key, 0field);
        assert_eq(stored_hash, expected_kya_hash);
    }
}