import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IStaffMember, StaffRole } from '../../interfaces/staff.interface';
import { NotificationsService } from '../../services/notifications.service';
import { StaffService } from '../../services/staff.service';
import { AuthService } from '../../services/auth.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatTooltipModule,
    PageLayout,
    PageHeader,
  ],
  templateUrl: './staff.html',
})
export class StaffComponent implements OnInit {
  private staffService = inject(StaffService);
  private notifications = inject(NotificationsService);
  public authService = inject(AuthService);
  private fb = inject(FormBuilder);

  // Estados de datos
  public staffList = signal<IStaffMember[]>([]);
  public isLoading = signal<boolean>(true);
  public isSaving = signal<boolean>(false);
  public searchQuery = signal<string>('');
  public filterStatus = signal<'all' | 'active' | 'suspended'>('all');

  // Modales
  public showModal = signal<boolean>(false);
  public editingStaff = signal<IStaffMember | null>(null);
  public showDeleteModal = signal<boolean>(false);
  public staffToDelete = signal<IStaffMember | null>(null);

  // Formulario
  public staffForm!: FormGroup;
  public showPassword = signal<boolean>(false);
  public showPin = signal<boolean>(false);

  // Métricas computadas
  public totalStaff = computed(() => this.staffList().length);
  public activeStaff = computed(() => this.staffList().filter((s) => s.isActive).length);
  public cashiersCount = computed(
    () => this.staffList().filter((s) => s.role === 'employee').length
  );
  public withPinCount = computed(() => this.staffList().filter((s) => s.hasPin).length);

  // Lista filtrada para la vista
  public filteredStaff = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.filterStatus();

    return this.staffList().filter((staff) => {
      // Filtro por estado
      if (status === 'active' && !staff.isActive) return false;
      if (status === 'suspended' && staff.isActive) return false;

      // Filtro por búsqueda
      if (query) {
        const fullName = `${staff.name} ${staff.lastName}`.toLowerCase();
        const email = staff.email.toLowerCase();
        const position = (staff.position || '').toLowerCase();
        const phone = (staff.phone || '').toLowerCase();
        return (
          fullName.includes(query) ||
          email.includes(query) ||
          position.includes(query) ||
          phone.includes(query)
        );
      }

      return true;
    });
  });

  ngOnInit(): void {
    this.initForm();
    this.loadStaff();
  }

  private initForm(): void {
    this.staffForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      lastName: [''],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      dni: [''],
      position: ['Cajero Mostrador', Validators.required],
      role: ['employee', Validators.required],
      password: ['', [Validators.minLength(6)]],
      pinCode: ['', [Validators.pattern(/^\d{4,6}$/)]],
      isActive: [true],
    });
  }

  public loadStaff(): void {
    this.isLoading.set(true);
    this.staffService.getStaff().subscribe({
      next: (res) => {
        this.staffList.set(res.data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notifications.error(err.error?.message || 'Error al cargar la lista de empleados');
      },
    });
  }

  public openCreateModal(): void {
    this.editingStaff.set(null);
    this.showPassword.set(false);
    this.showPin.set(false);
    this.staffForm.reset({
      name: '',
      lastName: '',
      email: '',
      phone: '',
      dni: '',
      position: 'Cajero Mostrador',
      role: 'employee',
      password: '',
      pinCode: '',
      isActive: true,
    });
    // Password es requerida al dar de alta
    this.staffForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.staffForm.get('password')?.updateValueAndValidity();
    this.showModal.set(true);
  }

  public openEditModal(staff: IStaffMember): void {
    this.editingStaff.set(staff);
    this.showPassword.set(false);
    this.showPin.set(false);
    this.staffForm.reset({
      name: staff.name,
      lastName: staff.lastName || '',
      email: staff.email,
      phone: staff.phone || '',
      dni: staff.dni || '',
      position: staff.position || 'Cajero Mostrador',
      role: staff.role,
      password: '',
      pinCode: '',
      isActive: staff.isActive,
    });
    // Password es opcional al editar
    this.staffForm.get('password')?.setValidators([Validators.minLength(6)]);
    this.staffForm.get('password')?.updateValueAndValidity();
    this.showModal.set(true);
  }

  public closeModal(): void {
    this.showModal.set(false);
    this.editingStaff.set(null);
    this.staffForm.reset();
  }

  public generateRandomPin(): void {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    this.staffForm.get('pinCode')?.setValue(randomPin);
    this.showPin.set(true);
    this.notifications.info(`PIN generado: ${randomPin}`);
  }

  public onSubmit(): void {
    if (this.staffForm.invalid) {
      this.staffForm.markAllAsTouched();
      this.notifications.warning('Por favor completá los campos obligatorios correctamente');
      return;
    }

    const formValue = this.staffForm.value;
    const editing = this.editingStaff();

    this.isSaving.set(true);

    if (editing) {
      // Actualizar empleado
      const payload: any = {
        name: formValue.name.trim(),
        lastName: formValue.lastName?.trim() || '',
        email: formValue.email.trim(),
        phone: formValue.phone?.trim() || '',
        dni: formValue.dni?.trim() || '',
        position: formValue.position?.trim(),
        role: formValue.role,
        isActive: formValue.isActive,
      };

      if (formValue.password && formValue.password.trim()) {
        payload.password = formValue.password.trim();
      }

      if (formValue.pinCode && formValue.pinCode.trim()) {
        payload.pinCode = formValue.pinCode.trim();
      }

      this.staffService.updateStaff(editing._id, payload).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.notifications.success('Empleado actualizado exitosamente');
          this.closeModal();
          this.loadStaff();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.notifications.error(err.error?.message || 'Error al actualizar empleado');
        },
      });
    } else {
      // Crear nuevo empleado
      const payload: any = {
        name: formValue.name.trim(),
        lastName: formValue.lastName?.trim() || '',
        email: formValue.email.trim(),
        password: formValue.password.trim(),
        phone: formValue.phone?.trim() || '',
        dni: formValue.dni?.trim() || '',
        position: formValue.position?.trim(),
        role: formValue.role,
      };

      if (formValue.pinCode && formValue.pinCode.trim()) {
        payload.pinCode = formValue.pinCode.trim();
      }

      this.staffService.createStaff(payload).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.notifications.success('Empleado creado exitosamente');
          this.closeModal();
          this.loadStaff();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.notifications.error(err.error?.message || 'Error al crear empleado');
        },
      });
    }
  }

  public toggleStatus(staff: IStaffMember, event: Event): void {
    event.stopPropagation();
    this.staffService.toggleStaffStatus(staff._id).subscribe({
      next: (res) => {
        this.notifications.success(res.message || 'Estado actualizado');
        // Actualizar localmente
        this.staffList.update((list) =>
          list.map((s) => (s._id === staff._id ? { ...s, isActive: !s.isActive } : s))
        );
      },
      error: (err) => {
        this.notifications.error(err.error?.message || 'Error al cambiar estado del empleado');
      },
    });
  }

  public confirmDelete(staff: IStaffMember, event: Event): void {
    event.stopPropagation();
    this.staffToDelete.set(staff);
    this.showDeleteModal.set(true);
  }

  public cancelDelete(): void {
    this.staffToDelete.set(null);
    this.showDeleteModal.set(false);
  }

  public executeDelete(): void {
    const staff = this.staffToDelete();
    if (!staff) return;

    this.isSaving.set(true);
    this.staffService.deleteStaff(staff._id).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notifications.success('Empleado eliminado del sistema');
        this.cancelDelete();
        this.staffList.update((list) => list.filter((s) => s._id !== staff._id));
      },
      error: (err) => {
        this.isSaving.set(false);
        this.notifications.error(err.error?.message || 'Error al eliminar empleado');
      },
    });
  }

  public getInitials(name: string, lastName?: string): string {
    const first = name ? name.charAt(0).toUpperCase() : '';
    const second = lastName ? lastName.charAt(0).toUpperCase() : '';
    return `${first}${second}` || 'U';
  }
}
